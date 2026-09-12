"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  Download,
  Upload,
  Camera,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  UserCheck,
  Shield,
  Layers,
} from "lucide-react";
import {
  fetchGallery,
  deleteGalleryPerson,
  enrollSubject,
  exportGalleryJson,
  importGalleryJson,
} from "../lib/api";
import { GalleryProfile } from "../lib/types";
import { LiveCameraEnrollModal } from "./LiveCameraEnrollModal";

export const GalleryManager: React.FC = () => {
  const [profiles, setProfiles] = useState<GalleryProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [enrollName, setEnrollName] = useState<string>("");
  const [capturedShots, setCapturedShots] = useState<Blob[]>([]);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);

  const loadGallery = async () => {
    setIsLoading(true);
    try {
      const data = await fetchGallery();
      setProfiles(data.profiles || []);
    } catch (err: any) {
      setFeedback({ type: "error", msg: "Failed to load gallery: " + err.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGallery();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      setCapturedShots((prev) => [...prev, ...fileList]);
    }
  };

  const handleEnrollSubmit = async () => {
    if (!enrollName.trim()) {
      setFeedback({ type: "error", msg: "Please enter subject name." });
      return;
    }
    if (capturedShots.length === 0) {
      setFeedback({ type: "error", msg: "Please select at least 1 image file or use the Live Camera." });
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      await enrollSubject(enrollName.trim(), capturedShots);
      setFeedback({
        type: "success",
        msg: `Successfully enrolled '${enrollName}' with ${capturedShots.length} shot centroid vector.`,
      });
      setEnrollName("");
      setCapturedShots([]);
      await loadGallery();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Enrollment failed." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Are you sure you want to delete '${name}' from the gallery?`)) return;
    try {
      await deleteGalleryPerson(name);
      setFeedback({ type: "success", msg: `Deleted '${name}'.` });
      await loadGallery();
    } catch (err: any) {
      setFeedback({ type: "error", msg: "Failed to delete: " + err.message });
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportGalleryJson();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nimbus_gallery_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setFeedback({ type: "error", msg: "Export failed: " + err.message });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const text = await e.target.files[0].text();
        const json = JSON.parse(text);
        const res = await importGalleryJson(json);
        setFeedback({
          type: "success",
          msg: `Successfully imported ${res.imported_count} profile(s).`,
        });
        await loadGallery();
      } catch (err: any) {
        setFeedback({ type: "error", msg: "Import error: " + err.message });
      }
    }
  };

  const handleModalEnrollSuccess = (name: string, numShots: number) => {
    setFeedback({
      type: "success",
      msg: `Successfully enrolled '${name}' with ${numShots} optical centroid shots.`,
    });
    setEnrollName("");
    setCapturedShots([]);
    loadGallery();
  };

  // Helper for colorful initial avatars
  const getAvatarGradient = (name: string) => {
    const gradients = [
      "from-cyan-500 to-blue-600",
      "from-indigo-500 to-purple-600",
      "from-violet-500 to-fuchsia-600",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-pink-600",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % gradients.length;
    return gradients[idx];
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Multi-Shot Enrollment Wizard */}
        <div className="glass-panel rounded-xl p-5 flex flex-col gap-4 border border-slate-700/60 shadow-xl">
          <div className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-slate-100 border-b border-border pb-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <span className="bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent">
              Face Enrollment Wizard
            </span>
          </div>

          {/* Subject Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Subject Name / Identity <span className="text-indigo-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Morgan"
              value={enrollName}
              onChange={(e) => setEnrollName(e.target.value)}
              className="px-3.5 py-2.5 text-sm bg-slate-950/90 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans shadow-inner"
            />
          </div>

          {/* Camera Pop-up & File Upload Buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="w-full py-3 px-4 text-xs font-bold bg-gradient-to-r from-cyan-600 via-sky-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg flex items-center justify-center gap-2 shadow-glow-cyan transition-all active:scale-[0.99]"
              >
                <Camera className="w-4 h-4" /> Open Camera (Live Biometric HUD)
              </button>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-slate-400">
                  Manual Upload: <strong className="text-indigo-300 font-mono">{capturedShots.length}</strong>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileUploadRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400" /> Select Files
                  </button>
                  <input
                    ref={fileUploadRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            </div>

            {/* Shots preview badges */}
            {capturedShots.length > 0 && (
              <div className="p-3 bg-slate-950/80 rounded-lg border border-indigo-800/40 flex items-center justify-between text-xs">
                <span className="text-indigo-200 font-mono flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  {capturedShots.length} file(s) queued for Centroid
                </span>
                <button
                  type="button"
                  onClick={() => setCapturedShots([])}
                  className="text-rose-400 hover:text-rose-300 text-xs font-semibold underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Submit Button for manual file upload */}
          <button
            type="button"
            onClick={handleEnrollSubmit}
            disabled={isLoading || capturedShots.length === 0 || !enrollName.trim()}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-all shadow-md flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Enroll from Files
          </button>

          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border shadow-lg ${
                feedback.type === "success"
                  ? "bg-emerald-950/90 border-emerald-600/70 text-emerald-200 shadow-glow-emerald"
                  : "bg-rose-950/90 border-rose-600/70 text-rose-200 shadow-glow-rose"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.msg}</span>
            </div>
          )}
        </div>

        {/* Right Column (2 spans): Enrolled Gallery Cards & Zero-DB Tools */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-5 flex flex-col gap-4 border border-slate-700/60 shadow-xl">
          {/* Header with Import/Export Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-200">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Users className="w-4 h-4" />
              </div>
              <span className="bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                Enrolled Gallery Profiles
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 text-xs font-mono font-bold">
                {profiles.length}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={loadGallery}
                className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                title="Refresh Gallery"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-1.5 text-xs font-bold bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 rounded-lg border border-amber-600/50 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" /> Export JSON
              </button>
              <button
                onClick={() => importFileRef.current?.click()}
                className="px-3 py-1.5 text-xs font-bold bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 rounded-lg border border-cyan-600/50 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" /> Import JSON
              </button>
              <input
                ref={importFileRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportFile}
              />
            </div>
          </div>

          {/* Profile Cards Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-cyan-400" /> Loading biometric gallery...
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
              No enrolled face profiles in the gallery. Use the Live Camera or select images on the left.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
              {profiles.map((p) => (
                <div
                  key={p.name}
                  className="bg-gradient-to-r from-slate-900/90 to-slate-950/90 border border-slate-800/80 hover:border-indigo-500/50 rounded-xl p-3.5 flex items-center justify-between transition-all group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    {/* Vibrant Initial Avatar */}
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(
                        p.name
                      )} flex items-center justify-center font-bold text-white text-sm shadow-md shrink-0`}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="font-bold text-sm text-slate-100 group-hover:text-cyan-200 transition-colors">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                        <span className="text-indigo-300 font-semibold">{p.num_shots} centroid shot(s)</span>
                        <span className="text-slate-600">•</span>
                        <span>{new Date(p.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(p.name)}
                    className="p-2 text-slate-500 hover:text-rose-300 hover:bg-rose-950/60 rounded-lg transition-colors"
                    title={`Delete ${p.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Camera Biometric Enrollment Pop-up Modal */}
      <LiveCameraEnrollModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onSuccess={handleModalEnrollSuccess}
        initialName={enrollName}
      />
    </>
  );
};
