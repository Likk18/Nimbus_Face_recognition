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

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Multi-Shot Enrollment Wizard */}
        <div className="bg-surface border border-border rounded-lg p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-200 border-b border-border pb-3">
            <UserPlus className="w-4 h-4 text-accent" />
            <span>Multi-Shot Face Enrollment</span>
          </div>

          {/* Subject Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-300">Subject Name / Identity</label>
            <input
              type="text"
              placeholder="e.g. Alex Morgan"
              value={enrollName}
              onChange={(e) => setEnrollName(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-900 border border-slate-700 rounded-md text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent font-sans"
            />
          </div>

          {/* Camera Pop-up & File Upload Buttons */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsCameraModalOpen(true)}
                className="w-full py-2.5 px-3 text-xs font-bold bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40 rounded-md flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99]"
              >
                <Camera className="w-4 h-4" /> Open Camera (Live Biometric HUD)
              </button>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-slate-400">
                  Uploaded Files: <strong className="text-slate-100">{capturedShots.length}</strong>
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileUploadRef.current?.click()}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-accent" /> Select Files
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
              <div className="p-2.5 bg-slate-900/80 rounded border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300 font-mono">
                  {capturedShots.length} file(s) queued for Centroid
                </span>
                <button
                  type="button"
                  onClick={() => setCapturedShots([])}
                  className="text-red-400 hover:text-red-300 text-xs underline"
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
            className="w-full py-2 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium text-sm rounded-md transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Enroll from Files
          </button>

          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`p-3 rounded text-xs flex items-center gap-2 border ${
                feedback.type === "success"
                  ? "bg-emerald-950/80 border-emerald-800 text-emerald-200"
                  : "bg-red-950/80 border-red-800 text-red-200"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{feedback.msg}</span>
            </div>
          )}
        </div>

        {/* Right Column (2 spans): Enrolled Gallery Cards & Zero-DB Tools */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5 flex flex-col gap-4">
          {/* Header with Import/Export Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-200">
              <Users className="w-4 h-4 text-accent" />
              <span>Enrolled Gallery ({profiles.length} Profiles)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadGallery}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
                title="Refresh Gallery"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleExport}
                className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export JSON
              </button>
              <button
                onClick={() => importFileRef.current?.click()}
                className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Import JSON
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
            <div className="flex items-center justify-center py-12 text-slate-500 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading gallery profiles...
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded">
              No enrolled face profiles in the gallery. Use the enrollment wizard on the left to register identities.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
              {profiles.map((p) => (
                <div
                  key={p.name}
                  className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="font-bold text-sm text-slate-100">{p.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                      <span>{p.num_shots} shot(s)</span>
                      <span>•</span>
                      <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(p.name)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
                    title="Delete subject"
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
