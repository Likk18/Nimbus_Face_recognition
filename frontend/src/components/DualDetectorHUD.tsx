"use client";

import React from "react";
import { Cpu, Eye, Compass, Layers, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
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
          <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-full bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 flex items-center gap-1.5 shadow-glow-emerald">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> FUSED DUAL CONSENSUS
          </span>
        );
      case "fallback_mtcnn":
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-full bg-amber-950/80 border border-amber-500/60 text-amber-300 flex items-center gap-1.5 shadow-glow-amber">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> FALLBACK: MTCNN ONLY
          </span>
        );
      case "fallback_yunet":
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-full bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 flex items-center gap-1.5 shadow-glow-cyan">
            <AlertTriangle className="w-3.5 h-3.5 text-cyan-400" /> FALLBACK: YUNET ONLY
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-mono rounded-full bg-slate-900 border border-slate-700 text-slate-400">
            AWAITING TARGET
          </span>
        );
    }
  };

  return (
    <div className="glass-panel rounded-xl p-5 flex flex-col gap-4 border border-slate-700/60 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
          <div className="w-6 h-6 rounded-md bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <span className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
            Dual-Verification Telemetry
          </span>
        </div>
        {getSourceBadge(source)}
      </div>

      {/* Grid of Detector Metrics with Distinct Colors */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* MTCNN Metric (Electric Indigo / Purple) */}
        <div className="bg-gradient-to-b from-indigo-950/50 to-slate-950/80 border border-indigo-700/40 rounded-lg p-3.5 flex flex-col gap-1.5 shadow-sm">
          <div className="flex justify-between items-center text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1 text-indigo-300 font-semibold">
              <Layers className="w-3.5 h-3.5 text-indigo-400" /> MTCNN (70%)
            </span>
            <span className="font-mono font-bold text-indigo-200 text-xs">
              {mtcnnConf !== null ? `${(mtcnnConf * 100).toFixed(1)}%` : "--"}
            </span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-indigo-950">
            <div
              className="bg-gradient-to-r from-indigo-600 to-violet-500 h-full transition-all duration-300 rounded-full"
              style={{ width: mtcnnConf !== null ? `${mtcnnConf * 100}%` : "0%" }}
            />
          </div>
        </div>

        {/* OpenCV YuNet Metric (Sky Cyan / Teal) */}
        <div className="bg-gradient-to-b from-cyan-950/50 to-slate-950/80 border border-cyan-700/40 rounded-lg p-3.5 flex flex-col gap-1.5 shadow-sm">
          <div className="flex justify-between items-center text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1 text-cyan-300 font-semibold">
              <Layers className="w-3.5 h-3.5 text-cyan-400" /> YuNet (30%)
            </span>
            <span className="font-mono font-bold text-cyan-200 text-xs">
              {yunetConf !== null ? `${(yunetConf * 100).toFixed(1)}%` : "--"}
            </span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-cyan-950">
            <div
              className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full transition-all duration-300 rounded-full"
              style={{ width: yunetConf !== null ? `${yunetConf * 100}%` : "0%" }}
            />
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row with Multi-Color Cards */}
      <div className="grid grid-cols-3 gap-2.5 pt-1 text-xs">
        {/* Fused Consensus Score */}
        <div className="bg-gradient-to-b from-purple-950/40 to-slate-950/80 p-3 rounded-lg border border-purple-800/40 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-purple-300 font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-400" />
            Consensus
          </span>
          <span className="font-mono font-bold text-purple-100 text-sm mt-0.5">
            {fusedConf !== null ? `${(fusedConf * 100).toFixed(1)}%` : "--"}
          </span>
        </div>

        {/* Head Tilt Angle */}
        <div className="bg-gradient-to-b from-emerald-950/40 to-slate-950/80 p-3 rounded-lg border border-emerald-800/40 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-emerald-300 font-semibold flex items-center gap-1">
            <Compass className="w-3 h-3 text-emerald-400" />
            Head Pose
          </span>
          <span className="font-mono font-bold text-emerald-100 text-sm mt-0.5">
            {rotationAngle !== null ? `${rotationAngle.toFixed(1)}°` : "--"}
          </span>
        </div>

        {/* 5-Point Affine Landmarks */}
        <div className="bg-gradient-to-b from-cyan-950/40 to-slate-950/80 p-3 rounded-lg border border-cyan-800/40 flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-cyan-300 font-semibold flex items-center gap-1">
            <Eye className="w-3 h-3 text-cyan-400" />
            Landmarks
          </span>
          <span className="font-mono font-bold text-cyan-100 text-sm mt-0.5">
            {face ? "5-Pt Affine" : "--"}
          </span>
        </div>
      </div>
    </div>
  );
};
