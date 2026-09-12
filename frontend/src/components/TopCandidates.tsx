"use client";

import React from "react";
import { UserCheck, UserX, Target, BarChart2, ShieldCheck, Award } from "lucide-react";
import { DetectedFace } from "../lib/types";

interface TopCandidatesProps {
  face: DetectedFace | null;
  threshold: number;
}

export const TopCandidates: React.FC<TopCandidatesProps> = ({ face, threshold }) => {
  const candidates = face?.top_candidates || [];
  const isRecognized = face?.is_recognized ?? false;
  const predictedName = face?.predicted_name ?? "UNKNOWN";
  const confidence = face?.similarity_score ?? 0;

  return (
    <div className="glass-panel rounded-xl p-5 flex flex-col gap-4 border border-slate-700/60 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
          <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Target className="w-3.5 h-3.5" />
          </div>
          <span className="bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
            Biometric Identity Matcher
          </span>
        </div>
        {face && (
          <span
            className={`px-3 py-1 text-xs font-mono font-bold rounded-full border flex items-center gap-1.5 shadow-sm ${
              isRecognized
                ? "bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-glow-emerald"
                : "bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-glow-rose"
            }`}
          >
            {isRecognized ? (
              <>
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> VERIFIED MATCH
              </>
            ) : (
              <>
                <UserX className="w-3.5 h-3.5 text-rose-400" /> REJECTED (&lt; τ)
              </>
            )}
          </span>
        )}
      </div>

      {/* Target Result Summary Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
          face
            ? isRecognized
              ? "bg-gradient-to-r from-emerald-950/70 via-teal-950/60 to-slate-950 border-emerald-500/60 shadow-glow-emerald"
              : "bg-gradient-to-r from-rose-950/70 via-red-950/60 to-slate-950 border-rose-500/60 shadow-glow-rose"
            : "bg-slate-900/60 border-slate-800"
        }`}
      >
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            Decision Verdict
          </div>
          <div className="text-lg font-extrabold font-mono text-white mt-0.5">
            {face ? predictedName : "Awaiting Face Target"}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Cosine Similarity
          </div>
          <div
            className={`text-xl font-extrabold font-mono mt-0.5 ${
              face ? (isRecognized ? "text-emerald-400" : "text-rose-400") : "text-slate-500"
            }`}
          >
            {face ? `${(confidence * 100).toFixed(1)}%` : "--"}
          </div>
        </div>
      </div>

      {/* Top Candidates Ranked List */}
      <div className="flex flex-col gap-2.5">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Gallery Embeddings Match Rank</span>
        </div>

        {candidates.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/50 rounded-lg border border-dashed border-slate-800">
            No gallery profiles enrolled to compare against.
          </div>
        ) : (
          candidates.map((cand, idx) => {
            const pct = Math.max(0, Math.min(100, cand.similarity * 100));
            const isMatch = cand.similarity >= threshold;
            const rankBadgeColor =
              idx === 0
                ? "bg-amber-950/80 border-amber-500/50 text-amber-300"
                : idx === 1
                ? "bg-slate-800/80 border-slate-600/50 text-slate-200"
                : "bg-indigo-950/80 border-indigo-700/50 text-indigo-300";

            return (
              <div
                key={cand.name}
                className="bg-gradient-to-r from-slate-900/90 to-slate-950/90 border border-slate-800/80 rounded-lg p-3 flex flex-col gap-2 hover:border-slate-700 transition-colors shadow-sm"
              >
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold border ${rankBadgeColor}`}>
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-100">{cand.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-400 text-[11px]">dist={cand.distance.toFixed(3)}</span>
                    <span
                      className={`font-bold ${isMatch ? "text-emerald-400 font-mono" : "text-slate-400 font-mono"}`}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Meter Bar with Threshold marker */}
                <div className="relative w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isMatch
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-glow-emerald"
                        : "bg-gradient-to-r from-slate-600 to-slate-700"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                  {/* Threshold mark needle */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10 rounded-full shadow-sm"
                    style={{ left: `${threshold * 100}%` }}
                    title={`Threshold: ${(threshold * 100).toFixed(0)}%`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
