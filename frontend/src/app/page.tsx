"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Eye,
  Users,
  Activity,
  Cpu,
  Layers,
  CheckCircle,
  AlertCircle,
  Radio,
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
    <main className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto gap-6">
      {/* Top Enterprise Command Center Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-100 uppercase">
                Nimbus Biometric Intelligence
              </h1>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dual-Verification (MTCNN 70% + OpenCV YuNet 30%) Face Recognition Engine
            </p>
          </div>
        </div>

        {/* System Health & Hardware Badges */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div
            className={`px-3 py-1 rounded-full border flex items-center gap-1.5 ${
              isOnline
                ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                : "bg-red-950/60 border-red-800 text-red-300"
            }`}
          >
            <Radio className={`w-3 h-3 ${isOnline ? "animate-pulse text-emerald-400" : "text-red-400"}`} />
            <span>{isOnline ? "CORE ONLINE" : "BACKEND OFFLINE"}</span>
          </div>

          {health && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
              <span>DEV: {health.device.toUpperCase()}</span>
              <span>•</span>
              <span>VEC: {health.embedding_dim}D</span>
              <span>•</span>
              <span>ENROLLED: {health.enrolled_faces_count}</span>
            </div>
          )}
        </div>
      </header>

      {/* Navigation Tabs Bar */}
      <nav className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("live")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === "live"
              ? "border-accent text-accent bg-accent/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Live HUD Inspector</span>
        </button>

        <button
          onClick={() => setActiveTab("gallery")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === "gallery"
              ? "border-accent text-accent bg-accent/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gallery & Enrollment</span>
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === "analytics"
              ? "border-accent text-accent bg-accent/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-4 h-4" />
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
      <footer className="mt-auto pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-500 gap-2">
        <div>NIMBUS FACE RECOGNITION • INCEPTION-RESNET-V1 • ZERO-DB ARCHITECTURE</div>
        <div className="flex items-center gap-3">
          <span>MTCNN: 70%</span>
          <span>•</span>
          <span>YUNET: 30%</span>
          <span>•</span>
          <span>WBF IOU: 0.45</span>
          <span>•</span>
          <span>TAU: {threshold.toFixed(2)}</span>
        </div>
      </footer>
    </main>
  );
}
