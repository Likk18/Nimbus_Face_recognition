export interface FaceCandidate {
  name: string;
  similarity: number;
  distance: number;
  is_match: boolean;
}

export interface DetectedFace {
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  confidence: number;
  landmarks: [number, number][]; // 5 points
  rotation_angle: number;
  detection_source: string;
  raw_detector_scores: {
    mtcnn?: number;
    yunet?: number;
    iou?: number;
  };
  predicted_name: string;
  similarity_score: number;
  is_recognized: boolean;
  top_candidates: FaceCandidate[];
}

export interface IdentifyResponse {
  num_faces: number;
  faces: DetectedFace[];
  threshold: number;
  latency_ms: number;
}

export interface GalleryProfile {
  name: string;
  num_shots: number;
  created_at: string;
  updated_at: string;
}

export interface GalleryListResponse {
  count: number;
  profiles: GalleryProfile[];
}

export interface EvaluationMetricPoint {
  threshold: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  far: number;
  frr: number;
  tpr: number;
  fpr: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

export interface EvaluationSummary {
  total_test_samples: number;
  enrolled_gallery_size: number;
  optimal_threshold_eer: number;
  equal_error_rate: number;
  roc_auc: number;
  default_metrics_at_0_65: EvaluationMetricPoint;
  sweep_results: EvaluationMetricPoint[];
}

export interface SystemHealth {
  status: string;
  device: string;
  embedding_dim: number;
  detector_weights: {
    mtcnn: number;
    yunet: number;
  };
  default_threshold: number;
  enrolled_faces_count: number;
}
