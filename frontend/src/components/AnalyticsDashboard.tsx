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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface border border-border rounded-lg p-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-200">
            <Activity className="w-4 h-4 text-accent" />
            <span>Biometric Security & Model Evaluation Suite</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated FAR/FRR threshold sweep, Equal Error Rate (EER) calibration, and ROC-AUC metrics.
          </p>
        </div>

        <button
          onClick={fetchBenchmark}
          disabled={isRunning}
          className="px-4 py-2 text-xs font-semibold rounded bg-accent hover:bg-accent-hover text-white flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? "animate-spin" : ""}`} />
          <span>{isRunning ? "Benchmarking..." : "Re-run Evaluation Suite"}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/80 border border-red-800 rounded text-xs text-red-200">
          {errorMsg}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Equal Error Rate */}
        <div className="bg-surface border border-border rounded-lg p-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Equal Error Rate (EER)
          </span>
          <span className="text-xl font-mono font-bold text-match">
            {(eer * 100).toFixed(2)}%
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Optimal τ = {optimalTau.toFixed(3)}
          </span>
        </div>

        {/* ROC-AUC */}
        <div className="bg-surface border border-border rounded-lg p-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            ROC-AUC Score
          </span>
          <span className="text-xl font-mono font-bold text-accent">
            {aucScore.toFixed(4)}
          </span>
          <span className="text-[10px] text-slate-500">Discrimination Power</span>
        </div>

        {/* Accuracy at tau=0.65 */}
        <div className="bg-surface border border-border rounded-lg p-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Accuracy (τ=0.65)
          </span>
          <span className="text-xl font-mono font-bold text-slate-100">
            {defaultMetrics ? `${(defaultMetrics.accuracy * 100).toFixed(1)}%` : "--"}
          </span>
          <span className="text-[10px] text-slate-500">Overall Decisions</span>
        </div>

        {/* Precision */}
        <div className="bg-surface border border-border rounded-lg p-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Precision
          </span>
          <span className="text-xl font-mono font-bold text-slate-100">
            {defaultMetrics ? `${(defaultMetrics.precision * 100).toFixed(1)}%` : "--"}
          </span>
          <span className="text-[10px] text-slate-500">Match Exactness</span>
        </div>

        {/* Recall */}
        <div className="bg-surface border border-border rounded-lg p-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Recall (TPR)
          </span>
          <span className="text-xl font-mono font-bold text-slate-100">
            {defaultMetrics ? `${(defaultMetrics.recall * 100).toFixed(1)}%` : "--"}
          </span>
          <span className="text-[10px] text-slate-500">Genuine Recognition</span>
        </div>

        {/* False Acceptance Rate */}
        <div className="bg-surface border border-border rounded-lg p-3.5 flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            FAR (Security)
          </span>
          <span className="text-xl font-mono font-bold text-reject">
            {defaultMetrics ? `${(defaultMetrics.far * 100).toFixed(2)}%` : "--"}
          </span>
          <span className="text-[10px] text-slate-500">Impostor Breaches</span>
        </div>
      </div>

      {/* Two Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* FAR vs. FRR Trade-off Curve */}
        <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
              <TrendingUp className="w-4 h-4 text-accent" />
              <span>Biometric Security Trade-Off (FAR vs. FRR)</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Active τ: <strong className="text-accent">{currentThreshold.toFixed(2)}</strong>
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={farFrrData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
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
                    backgroundColor: "#0f172a",
                    borderColor: "rgba(255,255,255,0.1)",
                    fontSize: 11,
                    fontFamily: "monospace",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Line
                  type="monotone"
                  dataKey="FAR"
                  name="FAR (False Accept %)"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="FRR"
                  name="FRR (False Reject %)"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  dot={false}
                />
                {/* Active slider threshold line */}
                <ReferenceLine
                  x={parseFloat(currentThreshold.toFixed(2))}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  label={{ value: `τ=${currentThreshold.toFixed(2)}`, fill: "#F59E0B", fontSize: 10 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROC Curve */}
        <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
              <Shield className="w-4 h-4 text-accent" />
              <span>ROC Curve (TPR vs. FPR)</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold">
              AUC = {aucScore.toFixed(4)}
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rocData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="FPR"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  unit="%"
                  domain={[0, 100]}
                />
                <YAxis
                  dataKey="TPR"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "rgba(255,255,255,0.1)",
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
                  strokeWidth={2.2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Confusion Matrix Table Breakdown */}
      {defaultMetrics && (
        <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-200">
              <BarChart2 className="w-4 h-4 text-accent" />
              <span>Biometric Security Confusion Matrix (Evaluated at τ = 0.65)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-900/80 border border-emerald-800/60 p-3 rounded flex flex-col gap-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">True Positives (TP)</span>
              <span className="text-xl font-mono font-bold text-slate-100">{defaultMetrics.tp}</span>
              <span className="text-[10px] text-slate-400">Enrolled face correctly matched</span>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">True Negatives (TN)</span>
              <span className="text-xl font-mono font-bold text-slate-100">{defaultMetrics.tn}</span>
              <span className="text-[10px] text-slate-400">Impostor correctly rejected as Unknown</span>
            </div>

            <div className="bg-slate-900/80 border border-red-900/60 p-3 rounded flex flex-col gap-1">
              <span className="text-[10px] font-bold text-red-400 uppercase">False Positives (FP)</span>
              <span className="text-xl font-mono font-bold text-red-400">{defaultMetrics.fp}</span>
              <span className="text-[10px] text-slate-400">Security Breach (False Acceptance)</span>
            </div>

            <div className="bg-slate-900/80 border border-amber-900/60 p-3 rounded flex flex-col gap-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase">False Negatives (FN)</span>
              <span className="text-xl font-mono font-bold text-amber-400">{defaultMetrics.fn}</span>
              <span className="text-[10px] text-slate-400">Authorized user denied access</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
