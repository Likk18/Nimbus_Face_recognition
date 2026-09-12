"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Camera, Upload, Play, Square, RefreshCw, Sliders, ShieldCheck, ShieldAlert, Cpu } from "lucide-react";
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
      }, 400); // 2.5 FPS analysis loop for smooth low-load UI
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

    // Match dimensions to display
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!currentResponse || currentResponse.faces.length === 0) return;

    // Compute coordinate scale between original image and canvas display
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
      const strokeColor = isRecognized ? "#10B981" : "#EF4444";
      const cornerLen = Math.max(12, Math.min(bw, bh) * 0.22);
      const lineWidth = 2.5;

      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeColor;
      ctx.lineCap = "square";

      // 4-Corner Viewfinder Reticles
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(x1, y1 + cornerLen);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1 + cornerLen, y1);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(x2 - cornerLen, y1);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x2, y1 + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(x1, y2 - cornerLen);
      ctx.lineTo(x1, y2);
      ctx.lineTo(x1 + cornerLen, y2);
      ctx.stroke();

      // Bottom-Right
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
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Status Badge Label
      const confPercent = (face.similarity_score * 100).toFixed(1);
      const labelText = `[${face.predicted_name}] ${confPercent}%`;

      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      const textMetrics = ctx.measureText(labelText);
      const bgW = textMetrics.width + 12;
      const bgH = 20;

      ctx.fillStyle = strokeColor;
      ctx.fillRect(x1, Math.max(0, y1 - bgH - 4), bgW, bgH);

      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(labelText, x1 + 6, Math.max(14, y1 - 9));
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

  return (
    <div className="flex flex-col h-full bg-surface border border-border rounded-lg overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-subtle">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-200">
          <Camera className="w-4 h-4 text-accent" />
          <span>OPTICAL TARGET HUD</span>
          {currentResponse && (
            <span className="ml-2 px-2 py-0.5 text-xs font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
              {currentResponse.latency_ms} ms
            </span>
          )}
        </div>

        {/* Input source toggle */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md p-0.5 bg-slate-900 border border-border">
            <button
              onClick={() => setMode("webcam")}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                mode === "webcam"
                  ? "bg-accent text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Live Webcam
            </button>
            <button
              onClick={() => {
                setMode("upload");
                fileInputRef.current?.click();
              }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                mode === "upload"
                  ? "bg-accent text-white"
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
          <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
            <Upload className="w-8 h-8 stroke-1" />
            <span className="text-xs">Select or drop an image file to analyze</span>
          </div>
        )}

        {/* Reticle Canvas Overlay */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Subtle crosshair grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center">
          <div className="w-12 h-12 border border-dashed border-slate-400 rounded-full" />
        </div>

        {/* Alert / Error badge */}
        {errorMsg && (
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded bg-red-950/80 border border-red-800 text-xs text-red-200 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar: Rejection Threshold Slider */}
      <div className="p-4 border-t border-border bg-surface-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Sliders className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
            Rejection Threshold (τ):
          </span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-accent">
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
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
            <span>0.30 (Lenient)</span>
            <span>0.65 (Calibrated Default)</span>
            <span>0.90 (Strict)</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={captureAndIdentify}
            disabled={isProcessing}
            className="px-3 py-1.5 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? "animate-spin" : ""}`} />
            <span>Scan Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
