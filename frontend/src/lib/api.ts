import {
  IdentifyResponse,
  GalleryListResponse,
  EvaluationSummary,
  SystemHealth,
} from "./types";

function getApiBase(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!envUrl || !envUrl.trim()) return "/api";
  const trimmed = envUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const API_BASE = getApiBase();

export async function fetchHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error("Backend service unreachable");
  return res.json();
}

export async function identifyImage(
  imageBlob: Blob,
  threshold: number = 0.65
): Promise<IdentifyResponse> {
  const formData = new FormData();
  formData.append("file", imageBlob, "frame.jpg");

  const res = await fetch(`${API_BASE}/identify?threshold=${threshold}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Identification request failed" }));
    throw new Error(err.detail || "Identification request failed");
  }

  return res.json();
}

export async function enrollSubject(
  name: string,
  images: Blob[]
): Promise<{ status: string; profile: any }> {
  const formData = new FormData();
  formData.append("name", name);
  images.forEach((blob, idx) => {
    formData.append("files", blob, `shot_${idx + 1}.jpg`);
  });

  const res = await fetch(`${API_BASE}/enroll`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Enrollment request failed" }));
    throw new Error(err.detail || "Enrollment request failed");
  }

  return res.json();
}

export async function fetchGallery(): Promise<GalleryListResponse> {
  const res = await fetch(`${API_BASE}/gallery`);
  if (!res.ok) throw new Error("Failed to fetch gallery");
  return res.json();
}

export async function deleteGalleryPerson(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/gallery/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete person");
}

export async function exportGalleryJson(): Promise<any> {
  const res = await fetch(`${API_BASE}/gallery/export`);
  if (!res.ok) throw new Error("Failed to export gallery");
  return res.json();
}

export async function importGalleryJson(payload: any): Promise<{ status: string; imported_count: number }> {
  const res = await fetch(`${API_BASE}/gallery/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to import gallery");
  return res.json();
}

export async function runEvaluation(): Promise<EvaluationSummary> {
  const res = await fetch(`${API_BASE}/evaluate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Evaluation failed to execute");
  return res.json();
}
