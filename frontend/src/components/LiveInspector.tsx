"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, Upload, RefreshCw, Sliders, ShieldCheck, ShieldAlert, Zap, Target } from "lucide-react";
import { identifyImage } from "../lib/api";
import { DetectedFace, IdentifyResponse } from "../lib/types";

interface LiveInspectorProps {
  threshold: number;
  onThresholdChange: (tau: number) => void;
  onFaceSelect: (face: DetectedFace | null) => void;
  selectedFace: DetectedFace | null;
}

export const LiveInspector: React.FC<LiveInspectorProps> = ({
  threshold,
  onThresholdChange,
  onFaceSelect,
  selectedFace,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"webcam" | "upload">("webcam");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentResponse, setCurrentResponse] = useState<IdentifyResponse | null>(null);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Start webcam stream
  const startCamera = async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err: any) {
      setErrorMsg("Camera access denied or unavailable: " + err.message);
      setIsStreaming(false);
    }
  };

  // Stop webcam stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    if (mode === "webcam") {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [mode]);

  // Capture frame and send to backend
  const captureAndIdentify = useCallback(async () => {
    if (isProcessing) return;

    let blob: Blob | null = null;

    if (mode === "webcam" && videoRef.current && isStreaming) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = videoRef.current.videoWidth || 640;
      tempCanvas.height = videoRef.current.videoHeight || 480;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
      blob = await new Promise<Blob | null>((resolve) =>
        tempCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.9)
      );
    } else if (mode === "upload" && uploadedImageSrc) {
      const res = await fetch(uploadedImageSrc);
      blob = await res.blob();
    }

    if (!blob) return;

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const resp = await identifyImage(blob, threshold);
      setCurrentResponse(resp);
      if (resp.faces.length > 0) {
        onFaceSelect(resp.faces[0]);
      } else {
        onFaceSelect(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Identification error");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, mode, isStreaming, uploadedImageSrc, threshold, onFaceSelect]);

  // Continuous loop for live webcam
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (mode === "webcam" && isStreaming) {
      intervalId = setInterval(() => {
        captureAndIdentify();
      }, 400); // 2.5 FPS analysis loop
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [mode, isStreaming, captureAndIdentify]);

  // Draw Camera Viewfinder Reticles on Canvas Overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!currentResponse || currentResponse.faces.length === 0) return;

    const video = videoRef.current;
    const origW = mode === "webcam" ? (video?.videoWidth || 640) : (canvas.width);
    const origH = mode === "webcam" ? (video?.videoHeight || 480) : (canvas.height);

    const scaleX = canvas.width / origW;
    const scaleY = canvas.height / origH;

    currentResponse.faces.forEach((face) => {
      const [origX1, origY1, origX2, origY2] = face.bbox;
      const x1 = origX1 * scaleX;
      const y1 = origY1 * scaleY;
      const x2 = origX2 * scaleX;
      const y2 = origY2 * scaleY;
      const bw = x2 - x1;
      const bh = y2 - y1;

      const isRecognized = face.is_recognized;
      const strokeColor = isRecognized ? "#10B981" : "#F43F5E";
      const cornerLen = Math.max(14, Math.min(bw, bh) * 0.24);
      const lineWidth = 2.5;

      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeColor;
      ctx.lineCap = "square";

      // 4-Corner Viewfinder Reticles
      ctx.beginPath();
      ctx.moveTo(x1, y1 + cornerLen);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 + cornerLen, y1);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2 - cornerLen, y1);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x2, y1 + cornerLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x1, y2 - cornerLen);
      ctx.lineTo(x1, y2);
      ctx.lineTo(x1 + cornerLen, y2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x2 - cornerLen, y2);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2, y2 - cornerLen);
      ctx.stroke();

      // Facial landmark crosshairs (5 points)
      face.landmarks.forEach(([lx, ly]) => {
        const px = lx * scaleX;
        const py = ly * scaleY;
        ctx.fillStyle = "#38BDF8";
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Status Badge Label
      const confPercent = (face.similarity_score * 100).toFixed(1);
      const labelText = `[${face.predicted_name}] ${confPercent}%`;

      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      const textMetrics = ctx.measureText(labelText);
      const bgW = textMetrics.width + 14;
      const bgH = 22;

      ctx.fillStyle = strokeColor;
      ctx.fillRect(x1, Math.max(0, y1 - bgH - 4), bgW, bgH);

      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(labelText, x1 + 7, Math.max(15, y1 - 8));
    });
  }, [currentResponse, mode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setUploadedImageSrc(url);
      setMode("upload");
      setTimeout(() => captureAndIdentify(), 100);
    }
  };

  const latencyMs = currentResponse?.latency_ms ?? null;

  return (
    <div className="glass-panel flex flex-col h-full rounded-xl overflow-hidden border border-slate-700/60 shadow-xl">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-gradient-to-r from-slate-900/90 to-slate-950/90">
        <div className="flex items-center gap-2.5 text-sm font-bold tracking-wider text-slate-100">
          <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Target className="w-3.5 h-3.5" />
          </div>
          <span className="uppercase bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
            Optical Target HUD
          </span>
          {latencyMs !== null && (
            <span
              className={`ml-2 px-2.5 py-0.5 text-xs font-mono font-bold rounded-full border flex items-center gap-1 ${
                latencyMs < 100
                  ? "bg-emerald-950/70 border-emerald-600/50 text-emerald-300"
                  : "bg-amber-950/70 border-amber-600/50 text-amber-300"
              }`}
            >
              <Zap className="w-3 h-3 text-cyan-400" />
              {latencyMs} ms
            </span>
          )}
        </div>

        {/* Input source toggle */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg p-1 bg-slate-950 border border-slate-800 shadow-inner">
            <button
              onClick={() => setMode("webcam")}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                mode === "webcam"
                  ? "bg-gradient-to-r from-cyan-600 to-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Live Camera
            </button>
            <button
              onClick={() => {
                setMode("upload");
                fileInputRef.current?.click();
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                mode === "upload"
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Upload Image
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Viewport Frame */}
      <div className="relative flex-1 min-h-[380px] bg-black flex items-center justify-center overflow-hidden">
        {mode === "webcam" ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : uploadedImageSrc ? (
          <img
            src={uploadedImageSrc}
            alt="Target"
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 gap-3 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-950/50 border border-indigo-800/40 flex items-center justify-center text-indigo-400">
              <Upload className="w-7 h-7" />
            </div>
            <span className="text-xs text-slate-400">Select an image file or switch to Live Camera</span>
          </div>
        )}

        {/* Reticle Canvas Overlay */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Status Header Overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-slate-700 text-[11px] font-mono text-cyan-300 font-semibold shadow-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            {mode === "webcam" ? "OPTICAL STREAM (2.5 FPS)" : "STATIC INSPECTION"}
          </span>
          {currentResponse?.faces && currentResponse.faces.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-emerald-950/80 backdrop-blur-md border border-emerald-600/60 text-[11px] font-mono text-emerald-300 font-bold shadow-glow-emerald">
              LOCK: {currentResponse.faces.length} TARGET(S)
            </span>
          )}
        </div>

        {/* Subtle crosshair grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center">
          <div className="w-16 h-16 border border-dashed border-cyan-400 rounded-full" />
        </div>

        {/* Alert / Error badge */}
        {errorMsg && (
          <div className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-rose-950/90 border border-rose-700 text-xs text-rose-200 flex items-center gap-2 shadow-lg">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar: Rejection Threshold Slider */}
      <div className="p-4 border-t border-border bg-gradient-to-r from-slate-900/90 via-slate-950/90 to-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-7 h-7 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Sliders className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
            Threshold (τ):
          </span>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-950 to-slate-900 border border-amber-600/60 text-amber-300 shadow-sm">
            {threshold.toFixed(2)}
          </span>
        </div>

        <div className="flex-1 max-w-md w-full px-2">
          <input
            type="range"
            min="0.30"
            max="0.90"
            step="0.01"
            value={threshold}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 shadow-inner"
          />
          <div className="flex justify-between text-[10px] font-mono mt-1 font-semibold">
            <span className="text-emerald-400">0.30 (Lenient)</span>
            <span className="text-amber-400">0.65 (Optimal EER)</span>
            <span className="text-rose-400">0.90 (Strict)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={captureAndIdentify}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white shadow-md flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin text-white" : ""}`} />
            <span>Scan Frame</span>
          </button>
        </div>
      </div>
    </div>
  );
};
