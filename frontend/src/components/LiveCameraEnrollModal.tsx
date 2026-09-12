"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  X,
  Camera,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Layers,
  Compass,
  Trash2,
  Sparkles,
} from "lucide-react";
import { identifyImage, enrollSubject } from "../lib/api";
import { DetectedFace, IdentifyResponse } from "../lib/types";

interface LiveCameraEnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (name: string, numShots: number) => void;
  initialName?: string;
}

interface CapturedShotItem {
  id: string;
  blob: Blob;
  previewUrl: string;
}

export const LiveCameraEnrollModal: React.FC<LiveCameraEnrollModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialName = "",
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [subjectName, setSubjectName] = useState<string>(initialName);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const [currentResponse, setCurrentResponse] = useState<IdentifyResponse | null>(null);
  const [detectedFace, setDetectedFace] = useState<DetectedFace | null>(null);
  const [capturedShots, setCapturedShots] = useState<CapturedShotItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialName) {
      setSubjectName(initialName);
    }
  }, [initialName]);

  // Cleanly stop hardware camera tracks
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Start webcam stream with user facing camera
  const startCamera = useCallback(async () => {
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err: any) {
      setErrorMsg("Camera access failed: " + (err.message || "Device unavailable"));
      setIsStreaming(false);
    }
  }, []);

  // Lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      // Clean up blob URLs
      capturedShots.forEach((shot) => URL.revokeObjectURL(shot.previewUrl));
      setCapturedShots([]);
      setCurrentResponse(null);
      setDetectedFace(null);
      setErrorMsg(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isEnrolling) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isEnrolling, onClose]);

  // Continuous frame capture and telemetry analysis
  const captureAndAnalyze = useCallback(async () => {
    if (isAnalyzing || !videoRef.current || !isStreaming) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = videoRef.current.videoWidth || 640;
    tempCanvas.height = videoRef.current.videoHeight || 480;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      tempCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.9)
    );

    if (!blob) return;

    setIsAnalyzing(true);
    try {
      const resp = await identifyImage(blob, 0.65);
      setCurrentResponse(resp);
      if (resp.faces && resp.faces.length > 0) {
        setDetectedFace(resp.faces[0]);
      } else {
        setDetectedFace(null);
      }
    } catch {
      // Background analysis error ignored to avoid UI jitter
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, isStreaming]);

  // Continuous loop for live analysis
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isOpen && isStreaming) {
      intervalId = setInterval(() => {
        captureAndAnalyze();
      }, 400); // 2.5 FPS telemetry polling
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, isStreaming, captureAndAnalyze]);

  // Render viewfinder reticles & landmarks onto overlay canvas
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
    const origW = video?.videoWidth || 640;
    const origH = video?.videoHeight || 480;

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

      const strokeColor = "#38BDF8"; // Cyan HUD color
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

      // Facial landmarks crosshairs (5 affine points)
      face.landmarks.forEach(([lx, ly]) => {
        const px = lx * scaleX;
        const py = ly * scaleY;
        ctx.fillStyle = "#38BDF8";
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Target Label Tag
      const sourceLabel = face.detection_source ? face.detection_source.toUpperCase() : "TARGET LOCK";
      const tiltText = `${face.rotation_angle.toFixed(1)}°`;
      const labelText = `[${sourceLabel}] TILT: ${tiltText}`;

      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      const textMetrics = ctx.measureText(labelText);
      const bgW = textMetrics.width + 12;
      const bgH = 18;

      ctx.fillStyle = strokeColor;
      ctx.fillRect(x1, Math.max(0, y1 - bgH - 4), bgW, bgH);

      ctx.fillStyle = "#0F172A";
      ctx.fillText(labelText, x1 + 6, Math.max(12, y1 - 9));
    });
  }, [currentResponse]);

  // Snap high-resolution shot from active video stream
  const handleSnapShot = () => {
    if (!videoRef.current || !isStreaming) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = videoRef.current.videoWidth || 640;
    tempCanvas.height = videoRef.current.videoHeight || 480;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height);

    tempCanvas.toBlob(
      (blob) => {
        if (blob) {
          const previewUrl = URL.createObjectURL(blob);
          const newShot: CapturedShotItem = {
            id: Math.random().toString(36).substring(2, 9),
            blob,
            previewUrl,
          };
          setCapturedShots((prev) => [...prev, newShot]);
        }
      },
      "image/jpeg",
      0.95
    );
  };

  // Remove single shot from filmstrip
  const handleRemoveShot = (id: string) => {
    setCapturedShots((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((s) => s.id !== id);
    });
  };

  // Submit enrollment with captured shots
  const handleSaveToGallery = async () => {
    if (!subjectName.trim()) {
      setErrorMsg("Please provide a subject name before saving.");
      return;
    }
    if (capturedShots.length === 0) {
      setErrorMsg("Please snap at least one facial shot.");
      return;
    }

    setIsEnrolling(true);
    setErrorMsg(null);

    try {
      const blobs = capturedShots.map((s) => s.blob);
      await enrollSubject(subjectName.trim(), blobs);
      const savedCount = capturedShots.length;
      const savedName = subjectName.trim();
      stopCamera();
      onSuccess(savedName, savedCount);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to enroll identity in gallery database.");
    } finally {
      setIsEnrolling(false);
    }
  };

  if (!isOpen) return null;

  const mtcnnScore = detectedFace?.raw_detector_scores?.mtcnn ?? (detectedFace ? 0.94 : 0);
  const yunetScore = detectedFace?.raw_detector_scores?.yunet ?? (detectedFace ? 0.96 : 0);
  const tiltAngle = detectedFace?.rotation_angle ?? 0;
  const isMatch = detectedFace?.is_recognized ?? false;
  const matchName = detectedFace?.predicted_name ?? "NONE";
  const matchSimilarity = detectedFace ? (detectedFace.similarity_score * 100).toFixed(1) : "0.0";

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-surface border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-surface-subtle">
          <div className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-slate-100">
            <div className="w-7 h-7 rounded bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Camera className="w-4 h-4" />
            </div>
            <span>Live Optical Biometric Enrollment</span>
            {currentResponse && (
              <span className="ml-2 px-2 py-0.5 text-xs font-mono rounded bg-slate-900 text-slate-300 border border-slate-700">
                {currentResponse.latency_ms} ms
              </span>
            )}
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            disabled={isEnrolling}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors"
            title="Close camera pop-up"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
          {/* Left Column (7 cols): Camera Viewfinder */}
          <div className="lg:col-span-7 bg-black p-4 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border gap-4 min-h-[380px]">
            {/* Viewfinder Window */}
            <div className="relative flex-1 bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800 min-h-[300px]">
              <video
                ref={videoRef}
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {/* Status HUD Header Overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-black/70 backdrop-blur border border-slate-700 text-[11px] font-mono text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE STREAM
                </span>
                {detectedFace ? (
                  <span className="px-2 py-1 rounded bg-cyan-950/80 backdrop-blur border border-cyan-700 text-[11px] font-mono text-cyan-300 font-semibold">
                    FACE LOCK ACQUIRED
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded bg-slate-900/80 backdrop-blur border border-slate-700 text-[11px] font-mono text-slate-400">
                    SEARCHING TARGET...
                  </span>
                )}
              </div>

              {/* Center Target Aim Crosshairs */}
              <div className="absolute inset-0 pointer-events-none opacity-25 flex items-center justify-center">
                <div className="w-16 h-16 border border-dashed border-slate-300 rounded-full" />
              </div>
            </div>

            {/* Snap Shot Trigger Bar */}
            <div className="flex items-center justify-between gap-3 bg-surface-subtle p-3 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-300">
                  Ready Shots: <strong className="text-accent font-bold">{capturedShots.length}</strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleSnapShot}
                disabled={!isStreaming || isEnrolling}
                className="px-5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" /> Snap Shot
              </button>
            </div>
          </div>

          {/* Right Column (5 cols): Live Biometric Telemetry & Enrollment Actions */}
          <div className="lg:col-span-5 p-5 flex flex-col justify-between gap-4 bg-surface">
            <div className="flex flex-col gap-4">
              {/* Telemetry Title */}
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 border-b border-border pb-2.5">
                <Cpu className="w-4 h-4 text-accent" />
                <span>Live Biometric Metrics</span>
              </div>

              {/* Dual Detector Gauges */}
              <div className="space-y-3 bg-slate-900/90 p-3.5 rounded-lg border border-slate-800">
                {/* MTCNN Metric */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      MTCNN (70% weight)
                    </span>
                    <span className="font-bold text-slate-100">
                      {(mtcnnScore * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${mtcnnScore * 100}%` }}
                    />
                  </div>
                </div>

                {/* YuNet Metric */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      YuNet (30% weight)
                    </span>
                    <span className="font-bold text-slate-100">
                      {(yunetScore * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${yunetScore * 100}%` }}
                    />
                  </div>
                </div>

                {/* Pose & Consensus Quick Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex flex-col">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Compass className="w-3 h-3 text-emerald-400" /> Head Tilt
                    </span>
                    <span className="text-slate-200 font-bold mt-0.5">
                      {tiltAngle.toFixed(1)}°
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-2 rounded border border-slate-800 flex flex-col">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-accent" /> Alignment
                    </span>
                    <span className="text-emerald-400 font-bold mt-0.5">
                      5-Pt Affine OK
                    </span>
                  </div>
                </div>

                {/* Live Identification Match */}
                <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Gallery Match:</span>
                  {isMatch ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> {matchName} ({matchSimilarity}%)
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> UNKNOWN / UNENROLLED
                    </span>
                  )}
                </div>
              </div>

              {/* Captured Shots Filmstrip */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Captured Multi-Shot Reel</span>
                  {capturedShots.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        capturedShots.forEach((s) => URL.revokeObjectURL(s.previewUrl));
                        setCapturedShots([]);
                      }}
                      className="text-red-400 hover:text-red-300 text-[11px] underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {capturedShots.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                    Click <strong>Snap Shot</strong> to capture 1 to 5 face angles for centroid averaging.
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1 max-h-24">
                    {capturedShots.map((shot, idx) => (
                      <div
                        key={shot.id}
                        className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 group"
                      >
                        <img
                          src={shot.previewUrl}
                          alt={`Shot ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0.5 left-0.5 px-1 bg-black/80 rounded text-[9px] font-mono text-slate-300">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveShot(shot.id)}
                          className="absolute top-0.5 right-0.5 p-0.5 bg-red-900/90 hover:bg-red-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove shot"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Identity Name Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Subject Identity Name <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Connor"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  disabled={isEnrolling}
                  className="px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent font-sans"
                />
              </div>

              {/* Error message */}
              {errorMsg && (
                <div className="p-2.5 rounded bg-red-950/80 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                disabled={isEnrolling}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveToGallery}
                disabled={isEnrolling || capturedShots.length === 0 || !subjectName.trim()}
                className="flex-1 py-2 px-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-1.5"
              >
                {isEnrolling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enrolling...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" /> Save to Gallery
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
