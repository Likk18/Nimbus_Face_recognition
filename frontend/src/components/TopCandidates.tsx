"use client";

import React from "react";
import { UserCheck, UserX, Target, BarChart2 } from "lucide-react";
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
    <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
          <Target className="w-4 h-4 text-accent" />
          <span>Biometric Identity Matcher</span>
        </div>
        {face && (
          <span
            className={`px-2 py-0.5 text-xs font-mono font-semibold rounded border flex items-center gap-1 ${
              isRecognized
                ? "bg-match-subtle border-match text-match"
                : "bg-reject-subtle border-reject text-reject"
            }`}
          >
            {isRecognized ? (
              <>
                <UserCheck className="w-3 h-3" /> VERIFIED
              </>
            ) : (
              <>
                <UserX className="w-3 h-3" /> REJECTED (&lt; τ)
              </>
            )}
          </span>
        )}
      </div>

      {/* Target Result Summary Banner */}
      <div
        className={`p-3 rounded-lg border flex items-center justify-between ${
          face
            ? isRecognized
              ? "bg-emerald-950/40 border-emerald-800/80"
              : "bg-red-950/40 border-red-800/80"
            : "bg-slate-900/40 border-slate-800"
        }`}
      >
        <div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Active Decision
          </div>
          <div className="text-base font-bold font-mono text-slate-100">
            {face ? predictedName : "Awaiting Face"}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Similarity
          </div>
          <div
            className={`text-base font-bold font-mono ${
              face ? (isRecognized ? "text-match" : "text-reject") : "text-slate-500"
            }`}
          >
            {face ? `${(confidence * 100).toFixed(1)}%` : "--"}
          </div>
        </div>
      </div>

      {/* Top Candidates Ranked List */}
      <div className="flex flex-col gap-2.5">
        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
          <BarChart2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Top Match Candidates (Gallery Vectors)</span>
        </div>

        {candidates.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-500 bg-slate-900/30 rounded border border-slate-800/50">
            No gallery candidates to match against.
          </div>
        ) : (
          candidates.map((cand, idx) => {
            const pct = Math.max(0, Math.min(100, cand.similarity * 100));
            const isMatch = cand.similarity >= threshold;

            return (
              <div
                key={cand.name}
                className="bg-slate-900/70 border border-slate-800 rounded p-2.5 flex flex-col gap-1.5"
              >
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500 text-[10px]">{idx + 1}.</span>
                    <span className="font-medium text-slate-200">{cand.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-slate-400 text-[11px]">d={cand.distance.toFixed(3)}</span>
                    <span
                      className={`font-bold ${isMatch ? "text-match" : "text-slate-400"}`}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Meter Bar with Threshold marker */}
                <div className="relative w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isMatch ? "bg-match" : "bg-slate-600"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                  {/* Threshold mark line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
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
