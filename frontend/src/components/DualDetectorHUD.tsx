"use client";

import React from "react";
import { Cpu, Eye, Compass, Layers, CheckCircle, AlertTriangle } from "lucide-react";
import { DetectedFace } from "../lib/types";

interface DualDetectorHUDProps {
  face: DetectedFace | null;
}

export const DualDetectorHUD: React.FC<DualDetectorHUDProps> = ({ face }) => {
  const mtcnnConf = face?.raw_detector_scores?.mtcnn ?? null;
  const yunetConf = face?.raw_detector_scores?.yunet ?? null;
  const fusedConf = face ? face.confidence : null;
  const rotationAngle = face ? face.rotation_angle : null;
  const source = face ? face.detection_source : "IDLE";

  const getSourceBadge = (src: string) => {
    switch (src) {
      case "fused":
        return (
          <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> FUSED DUAL CONSENSUS
          </span>
        );
      case "fallback_mtcnn":
        return (
          <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-amber-950/80 border border-amber-700 text-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> FALLBACK: MTCNN ONLY
          </span>
        );
      case "fallback_yunet":
        return (
          <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-amber-950/80 border border-amber-700 text-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> FALLBACK: YUNET ONLY
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-900 border border-slate-800 text-slate-400">
            AWAITING TARGET
          </span>
        );
    }
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
          <Cpu className="w-4 h-4 text-accent" />
          <span>Dual-Verification Telemetry</span>
        </div>
        {getSourceBadge(source)}
      </div>

      {/* Grid of Detector Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {/* MTCNN Metric */}
        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 flex flex-col gap-1">
          <div className="flex justify-between items-center text-[11px] font-medium text-slate-400">
            <span>MTCNN (Weight 70%)</span>
            <span className="font-mono text-accent">
              {mtcnnConf !== null ? `${(mtcnnConf * 100).toFixed(1)}%` : "--"}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-accent h-full transition-all duration-300"
              style={{ width: mtcnnConf !== null ? `${mtcnnConf * 100}%` : "0%" }}
            />
          </div>
        </div>

        {/* OpenCV YuNet Metric */}
        <div className="bg-slate-900/60 border border-slate-800 rounded p-3 flex flex-col gap-1">
          <div className="flex justify-between items-center text-[11px] font-medium text-slate-400">
            <span>OpenCV YuNet (Weight 30%)</span>
            <span className="font-mono text-sky-400">
              {yunetConf !== null ? `${(yunetConf * 100).toFixed(1)}%` : "--"}
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-sky-400 h-full transition-all duration-300"
              style={{ width: yunetConf !== null ? `${yunetConf * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
        <div className="bg-surface-elevated p-2.5 rounded border border-border flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-400 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            Fused Score
          </span>
          <span className="font-mono font-bold text-slate-100 text-sm">
            {fusedConf !== null ? `${(fusedConf * 100).toFixed(1)}%` : "--"}
          </span>
        </div>

        <div className="bg-surface-elevated p-2.5 rounded border border-border flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-400 flex items-center gap-1">
            <Compass className="w-3 h-3 text-slate-400" />
            Head Tilt
          </span>
          <span className="font-mono font-bold text-slate-100 text-sm">
            {rotationAngle !== null ? `${rotationAngle.toFixed(1)}°` : "--"}
          </span>
        </div>

        <div className="bg-surface-elevated p-2.5 rounded border border-border flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-400 flex items-center gap-1">
            <Eye className="w-3 h-3 text-slate-400" />
            Landmarks
          </span>
          <span className="font-mono font-bold text-slate-100 text-sm">
            {face ? "5-Pt Affine" : "--"}
          </span>
        </div>
      </div>
    </div>
  );
};
