"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Eye,
  Users,
  Activity,
  Cpu,
  Layers,
  Radio,
  Sparkles,
  Server,
} from "lucide-react";
import { LiveInspector } from "../components/LiveInspector";
import { DualDetectorHUD } from "../components/DualDetectorHUD";
import { TopCandidates } from "../components/TopCandidates";
import { GalleryManager } from "../components/GalleryManager";
import { AnalyticsDashboard } from "../components/AnalyticsDashboard";
import { fetchHealth } from "../lib/api";
import { DetectedFace, SystemHealth } from "../lib/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"live" | "gallery" | "analytics">("live");
  const [threshold, setThreshold] = useState<number>(0.65);
  const [selectedFace, setSelectedFace] = useState<DetectedFace | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(false);

  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const data = await fetchHealth();
        setHealth(data);
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto gap-6 font-sans">
      {/* Top Enterprise Command Center Header */}
      <header className="glass-panel rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-700/60 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 via-indigo-500/20 to-purple-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shadow-glow-cyan shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-indigo-200 bg-clip-text text-transparent uppercase">
                Nimbus Biometric Intelligence
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-950 to-indigo-950 border border-cyan-700/50 text-cyan-300">
                ENTERPRISE v1.0
              </span>
            </div>
            <p className="text-xs text-slate-300/80 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Dual-Verification Engine:</span>
              <span className="text-indigo-400 font-semibold font-mono">MTCNN 70%</span>
              <span className="text-slate-500">+</span>
              <span className="text-cyan-400 font-semibold font-mono">YuNet 30%</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-semibold font-mono">Zero-DB Centroids</span>
            </p>
          </div>
        </div>

        {/* System Health & Hardware Badges */}
        <div className="flex items-center gap-2 text-xs font-mono flex-wrap">
          <div
            className={`px-3 py-1.5 rounded-full border flex items-center gap-2 shadow-sm ${
              isOnline
                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-glow-emerald"
                : "bg-rose-950/80 border-rose-500/50 text-rose-300 shadow-glow-rose"
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isOnline ? "animate-pulse text-emerald-400" : "text-rose-400"}`} />
            <span className="font-bold tracking-wider">{isOnline ? "CORE ONLINE" : "BACKEND OFFLINE"}</span>
          </div>

          {health && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="px-2.5 py-1 rounded-full bg-indigo-950/70 border border-indigo-700/60 text-indigo-300 flex items-center gap-1 text-[11px]">
                <Cpu className="w-3 h-3 text-indigo-400" />
                <span>{health.device.toUpperCase()}</span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 flex items-center gap-1 text-[11px]">
                <Layers className="w-3 h-3 text-cyan-400" />
                <span>{health.embedding_dim}D</span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-purple-950/70 border border-purple-700/60 text-purple-300 flex items-center gap-1 text-[11px]">
                <Users className="w-3 h-3 text-purple-400" />
                <span>{health.enrolled_faces_count} ENROLLED</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Navigation Tabs Bar with Rich Distinct Color Themes */}
      <nav className="flex gap-2 p-1.5 bg-slate-950/80 rounded-xl border border-slate-800 backdrop-blur-md">
        <button
          onClick={() => setActiveTab("live")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === "live"
              ? "bg-gradient-to-r from-cyan-600/30 to-sky-600/20 text-cyan-300 border border-cyan-500/50 shadow-glow-cyan"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent"
          }`}
        >
          <Eye className={`w-4 h-4 ${activeTab === "live" ? "text-cyan-400" : "text-slate-400"}`} />
          <span>Live HUD Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab("gallery")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === "gallery"
              ? "bg-gradient-to-r from-indigo-600/30 to-violet-600/20 text-indigo-300 border border-indigo-500/50 shadow-glow-indigo"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent"
          }`}
        >
          <Users className={`w-4 h-4 ${activeTab === "gallery" ? "text-indigo-400" : "text-slate-400"}`} />
          <span>Gallery & Enrollment</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
            activeTab === "analytics"
              ? "bg-gradient-to-r from-amber-600/30 to-emerald-600/20 text-amber-300 border border-amber-500/50 shadow-glow-amber"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent"
          }`}
        >
          <Activity className={`w-4 h-4 ${activeTab === "analytics" ? "text-amber-400" : "text-slate-400"}`} />
          <span>Biometric Analytics</span>
        </button>
      </nav>

      {/* Main Tab Views */}
      <section className="flex-1">
        {activeTab === "live" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Live Camera Viewfinder (7 cols) */}
            <div className="lg:col-span-7 flex flex-col">
              <LiveInspector
                threshold={threshold}
                onThresholdChange={setThreshold}
                onFaceSelect={setSelectedFace}
                selectedFace={selectedFace}
              />
            </div>

            {/* Right Telemetry Column (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <DualDetectorHUD face={selectedFace} />
              <TopCandidates face={selectedFace} threshold={threshold} />
            </div>
          </div>
        )}

        {activeTab === "gallery" && <GalleryManager />}

        {activeTab === "analytics" && <AnalyticsDashboard currentThreshold={threshold} />}
      </section>

      {/* Footer System Status Bar */}
      <footer className="mt-auto glass-panel rounded-lg p-3.5 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-400 gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          <Server className="w-3.5 h-3.5 text-cyan-400" />
          <span>NIMBUS FACE RECOGNITION</span>
          <span className="text-slate-600">•</span>
          <span className="text-indigo-300">INCEPTION-RESNET-V1</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-300">ZERO-DB CENTROIDS</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          <span className="px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-700/60 text-indigo-300 font-bold">
            MTCNN: 70%
          </span>
          <span className="px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 font-bold">
            YUNET: 30%
          </span>
          <span className="px-2 py-0.5 rounded bg-purple-950/70 border border-purple-700/60 text-purple-300 font-bold">
            IOU: 0.45
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/60 text-amber-300 font-bold">
            TAU: {threshold.toFixed(2)}
          </span>
        </div>
      </footer>
    </main>
  );
}
