"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart2,
  TrendingUp,
  Shield,
  Activity,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Sliders,
  Award,
  Lock,
  Percent,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { runEvaluation } from "../lib/api";
import { EvaluationSummary } from "../lib/types";

interface AnalyticsDashboardProps {
  currentThreshold: number;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ currentThreshold }) => {
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBenchmark = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    try {
      const data = await runEvaluation();
      setSummary(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute benchmark evaluation.");
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    fetchBenchmark();
  }, []);

  const defaultMetrics = summary?.default_metrics_at_0_65;
  const optimalTau = summary?.optimal_threshold_eer ?? 0.65;
  const eer = summary?.equal_error_rate ?? 0;
  const aucScore = summary?.roc_auc ?? 1.0;

  // Prepare chart data
  const farFrrData = summary?.sweep_results.map((r) => ({
    threshold: r.threshold,
    FAR: parseFloat((r.far * 100).toFixed(2)),
    FRR: parseFloat((r.frr * 100).toFixed(2)),
    Accuracy: parseFloat((r.accuracy * 100).toFixed(2)),
  })) || [];

  const rocData = summary?.sweep_results.map((r) => ({
    FPR: parseFloat((r.fpr * 100).toFixed(2)),
    TPR: parseFloat((r.tpr * 100).toFixed(2)),
  })) || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Action Bar */}
      <div className="glass-panel rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-700/60 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-glow-amber shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-100">
              <span className="bg-gradient-to-r from-white via-amber-100 to-emerald-200 bg-clip-text text-transparent">
                Biometric Security & Model Evaluation Suite
              </span>
            </div>
            <p className="text-xs text-slate-300/80 mt-0.5">
              Automated FAR/FRR threshold sweep, Equal Error Rate (EER) calibration, and ROC-AUC discrimination metrics.
            </p>
          </div>
        </div>

        <button
          onClick={fetchBenchmark}
          disabled={isRunning}
          className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-600 via-emerald-600 to-teal-600 hover:from-amber-500 hover:to-teal-500 text-white shadow-glow-amber flex items-center gap-2 transition-all active:scale-95 disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
          <span>{isRunning ? "Benchmarking Models..." : "Re-run Evaluation Suite"}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-rose-950/90 border border-rose-600/70 rounded-xl text-xs text-rose-200 shadow-lg">
          {errorMsg}
        </div>
      )}

      {/* KPI Cards Grid with Distinct Colorful Themes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Equal Error Rate (Emerald) */}
        <div className="bg-gradient-to-b from-emerald-950/60 via-teal-950/40 to-slate-950 border border-emerald-500/50 rounded-xl p-4 flex flex-col gap-1 shadow-glow-emerald">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            Equal Error Rate
          </span>
          <span className="text-2xl font-mono font-extrabold text-emerald-400">
            {(eer * 100).toFixed(2)}%
          </span>
          <span className="text-[10px] text-emerald-300/80 font-mono">
            Optimal τ = {optimalTau.toFixed(3)}
          </span>
        </div>

        {/* ROC-AUC (Electric Violet / Indigo) */}
        <div className="bg-gradient-to-b from-indigo-950/60 via-violet-950/40 to-slate-950 border border-indigo-500/50 rounded-xl p-4 flex flex-col gap-1 shadow-glow-indigo">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
            ROC-AUC Score
          </span>
          <span className="text-2xl font-mono font-extrabold text-indigo-400">
            {aucScore.toFixed(4)}
          </span>
          <span className="text-[10px] text-indigo-300/80">Discrimination Power</span>
        </div>

        {/* Accuracy at tau=0.65 (Sky Cyan) */}
        <div className="bg-gradient-to-b from-cyan-950/60 via-sky-950/40 to-slate-950 border border-cyan-500/50 rounded-xl p-4 flex flex-col gap-1 shadow-glow-cyan">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
            Accuracy (τ=0.65)
          </span>
          <span className="text-2xl font-mono font-extrabold text-cyan-400">
            {defaultMetrics ? `${(defaultMetrics.accuracy * 100).toFixed(1)}%` : "--"}
          </span>
          <span className="text-[10px] text-cyan-300/80">Overall Decisions</span>
        </div>

        {/* Precision (Fuchsia / Purple) */}
        <div className="bg-gradient-to-b from-purple-950/60 via-fuchsia-950/40 to-slate-950 border border-purple-500/50 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">
            Precision
          </span>
          <span className="text-2xl font-mono font-extrabold text-purple-300">
            {defaultMetrics ? `${(defaultMetrics.precision * 100).toFixed(1)}%` : "--"}
          </span>
          <span className="text-[10px] text-purple-400/80">Match Exactness</span>
        </div>

        {/* Recall (Blue / Teal) */}
        <div className="bg-gradient-to-b from-blue-950/60 via-sky-950/40 to-slate-950 border border-blue-500/50 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
            Recall (TPR)
          </span>
          <span className="text-2xl font-mono font-extrabold text-blue-300">
            {defaultMetrics ? `${(defaultMetrics.recall * 100).toFixed(1)}%` : "--"}
          </span>
          <span className="text-[10px] text-blue-400/80">Genuine Match Rate</span>
        </div>

        {/* False Acceptance Rate (Rose / Crimson) */}
        <div className="bg-gradient-to-b from-rose-950/60 via-red-950/40 to-slate-950 border border-rose-500/50 rounded-xl p-4 flex flex-col gap-1 shadow-glow-rose">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
            FAR (Security)
          </span>
          <span className="text-2xl font-mono font-extrabold text-rose-400">
            {defaultMetrics ? `${(defaultMetrics.far * 100).toFixed(2)}%` : "--"}
          </span>
          <span className="text-[10px] text-rose-300/80">Impostor Breaches</span>
        </div>
      </div>

      {/* Two Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FAR vs. FRR Trade-off Curve */}
        <div className="glass-panel rounded-xl p-5 flex flex-col gap-3.5 border border-slate-700/60 shadow-xl">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span className="bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">
                Biometric Security Trade-Off (FAR vs. FRR)
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-300 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700">
              Active τ: <strong className="text-amber-400">{currentThreshold.toFixed(2)}</strong>
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={farFrrData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="threshold"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(val) => val.toFixed(2)}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b1120",
                    borderColor: "rgba(56, 189, 248, 0.3)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
                    fontSize: 11,
                    fontFamily: "monospace",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Line
                  type="monotone"
                  dataKey="FAR"
                  name="FAR (False Accept %)"
                  stroke="#F43F5E"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="FRR"
                  name="FRR (False Reject %)"
                  stroke="#06B6D4"
                  strokeWidth={2.5}
                  dot={false}
                />
                {/* Active slider threshold line */}
                <ReferenceLine
                  x={parseFloat(currentThreshold.toFixed(2))}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{ value: `τ=${currentThreshold.toFixed(2)}`, fill: "#F59E0B", fontSize: 10 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROC Curve */}
        <div className="glass-panel rounded-xl p-5 flex flex-col gap-3.5 border border-slate-700/60 shadow-xl">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">
                ROC Curve (TPR vs. FPR)
              </span>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold shadow-glow-emerald">
              AUC = {aucScore.toFixed(4)}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rocData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="FPR"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  unit="%"
                  domain={[0, 100]}
                />
                <YAxis
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0b1120",
                    borderColor: "rgba(16, 185, 129, 0.3)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
                    fontSize: 11,
                    fontFamily: "monospace",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Line
                  type="monotone"
                  dataKey="TPR"
                  name="Inception-ResNet-V1"
                  stroke="#10B981"
                  strokeWidth={2.8}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Confusion Matrix Table Breakdown */}
      {defaultMetrics && (
        <div className="glass-panel rounded-xl p-5 flex flex-col gap-3.5 border border-slate-700/60 shadow-xl">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
              <BarChart2 className="w-4 h-4 text-cyan-400" />
              <span className="bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                Biometric Security Confusion Matrix (Evaluated at τ = 0.65)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
            <div className="bg-gradient-to-b from-emerald-950/60 to-slate-950 border border-emerald-600/50 p-3.5 rounded-xl flex flex-col gap-1 shadow-sm">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">True Positives (TP)</span>
              <span className="text-2xl font-mono font-extrabold text-emerald-300">{defaultMetrics.tp}</span>
              <span className="text-[10px] text-slate-400">Enrolled face correctly matched</span>
            </div>

            <div className="bg-gradient-to-b from-indigo-950/60 to-slate-950 border border-indigo-600/50 p-3.5 rounded-xl flex flex-col gap-1 shadow-sm">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">True Negatives (TN)</span>
              <span className="text-2xl font-mono font-extrabold text-indigo-300">{defaultMetrics.tn}</span>
              <span className="text-[10px] text-slate-400">Impostor correctly rejected as Unknown</span>
            </div>

            <div className="bg-gradient-to-b from-rose-950/60 to-slate-950 border border-rose-600/50 p-3.5 rounded-xl flex flex-col gap-1 shadow-sm">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">False Positives (FP)</span>
              <span className="text-2xl font-mono font-extrabold text-rose-400">{defaultMetrics.fp}</span>
              <span className="text-[10px] text-slate-400">Security Breach (False Acceptance)</span>
            </div>

            <div className="bg-gradient-to-b from-amber-950/60 to-slate-950 border border-amber-600/50 p-3.5 rounded-xl flex flex-col gap-1 shadow-sm">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">False Negatives (FN)</span>
              <span className="text-2xl font-mono font-extrabold text-amber-300">{defaultMetrics.fn}</span>
              <span className="text-[10px] text-slate-400">Authorized user denied access</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
