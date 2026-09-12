import time
from typing import List, Dict, Any, Optional, Tuple
import cv2
import numpy as np

from backend.src import config
from backend.src.aligner import FaceAligner
from backend.src.detector import DualVerificationDetector, FaceDetection
from backend.src.embedder import FaceEmbedder
from backend.src.database import GalleryDatabase
from backend.src.matcher import FaceMatcher, MatchResult

class InferencePipeline:
    def __init__(
        self,
        detector: Optional[DualVerificationDetector] = None,
        aligner: Optional[FaceAligner] = None,
        embedder: Optional[FaceEmbedder] = None,
        database: Optional[GalleryDatabase] = None,
        matcher: Optional[FaceMatcher] = None
    ):
        self.detector = detector or DualVerificationDetector()
        self.aligner = aligner or FaceAligner()
        self.embedder = embedder or FaceEmbedder()
        self.database = database or GalleryDatabase()
        self.matcher = matcher or FaceMatcher(database=self.database)

    def process_image(
        self,
        image_bgr: np.ndarray,
        threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        start_time = time.perf_counter()
        tau = float(threshold if threshold is not None else config.DEFAULT_REJECTION_THRESHOLD)

        if image_bgr is None or image_bgr.size == 0:
            return {
                "num_faces": 0,
                "faces": [],
                "threshold": tau,
                "latency_ms": 0.0
            }

        # 1. Dual-Verification Detection
        detections: List[FaceDetection] = self.detector.detect(image_bgr)
        
        faces_results = []
        for det in detections:
            # 2. 5-point landmark affine alignment
            try:
                aligned_crop, angle, _ = self.aligner.align_face_5point(
                    image_bgr, 
                    det.landmarks,
                    bounding_box=det.bbox
                )
            except Exception:
                aligned_crop = self.aligner.align_from_box_fallback(image_bgr, det.bbox)
                angle = 0.0

            # 3. Deep 512-D feature extraction
            embedding = self.embedder.extract(aligned_crop, is_bgr=True)

            # 4. Vectorized cosine similarity matching & rejection
            match_res: MatchResult = self.matcher.match(embedding, threshold=tau)

            faces_results.append({
                "bbox": [float(v) for v in det.bbox],
                "confidence": float(det.confidence),
                "landmarks": [[float(p[0]), float(p[1])] for p in det.landmarks],
                "rotation_angle": float(angle),
                "detection_source": det.source,
                "raw_detector_scores": det.raw_scores,
                "predicted_name": match_res.predicted_name,
                "similarity_score": float(match_res.confidence),
                "is_recognized": bool(match_res.is_recognized),
                "top_candidates": [c.to_dict() for c in match_res.top_candidates]
            })

        latency = (time.perf_counter() - start_time) * 1000.0

        return {
            "num_faces": len(faces_results),
            "faces": faces_results,
            "threshold": tau,
            "latency_ms": float(round(latency, 2))
        }

    def enroll_from_images(
        self,
        name: str,
        images_bgr: List[np.ndarray]
    ) -> Dict[str, Any]:
        if not images_bgr:
            raise ValueError("No images provided for enrollment.")

        embeddings = []
        successful_shots = 0

        for img in images_bgr:
            if img is None or img.size == 0:
                continue
            detections = self.detector.detect(img)
            if not detections:
                continue
            
            # Select the most prominent face (highest confidence)
            best_det = max(detections, key=lambda d: d.confidence)
            try:
                aligned_crop, _, _ = self.aligner.align_face_5point(img, best_det.landmarks)
            except Exception:
                aligned_crop = self.aligner.align_from_box_fallback(img, best_det.bbox)

            emb = self.embedder.extract(aligned_crop, is_bgr=True)
            embeddings.append(emb)
            successful_shots += 1

        if not embeddings:
            raise ValueError(f"Could not detect any face in the provided images for {name}.")

        profile = self.database.enroll_person(name, embeddings)
        return {
            "name": profile.name,
            "num_shots": profile.num_shots,
            "created_at": profile.created_at,
            "updated_at": profile.updated_at
        }

    def annotate_image(
        self,
        image_bgr: np.ndarray,
        results: Dict[str, Any]
    ) -> np.ndarray:
        annotated = image_bgr.copy()
        h, w = annotated.shape[:2]

        for face in results.get("faces", []):
            x1, y1, x2, y2 = [int(v) for v in face["bbox"]]
            is_rec = face["is_recognized"]
            name = face["predicted_name"]
            score = face["similarity_score"] * 100.0

            # Green for recognized, Red for unknown
            color = (0, 200, 50) if is_rec else (30, 30, 230)
            corner_len = max(8, int(min(x2 - x1, y2 - y1) * 0.2))
            thickness = 2

            # Camera Viewfinder 4-Corner L-brackets
            # Top-left
            cv2.line(annotated, (x1, y1), (x1 + corner_len, y1), color, thickness)
            cv2.line(annotated, (x1, y1), (x1, y1 + corner_len), color, thickness)
            # Top-right
            cv2.line(annotated, (x2, y1), (x2 - corner_len, y1), color, thickness)
            cv2.line(annotated, (x2, y1), (x2, y1 + corner_len), color, thickness)
            # Bottom-left
            cv2.line(annotated, (x1, y2), (x1 + corner_len, y2), color, thickness)
            cv2.line(annotated, (x1, y2), (x1, y2 - corner_len), color, thickness)
            # Bottom-right
            cv2.line(annotated, (x2, y2), (x2 - corner_len, y2), color, thickness)
            cv2.line(annotated, (x2, y2), (x2, y2 - corner_len), color, thickness)

            # Draw subtle landmark points
            for pt in face.get("landmarks", []):
                px, py = int(pt[0]), int(pt[1])
                cv2.circle(annotated, (px, py), 2, (0, 255, 255), -1)

            # Badge Label
            label = f"[{name}] {score:.1f}%"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(annotated, (x1, max(0, y1 - th - 8)), (x1 + tw + 6, max(0, y1)), color, -1)
            cv2.putText(
                annotated,
                label,
                (x1 + 3, max(0, y1 - 4)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (255, 255, 255),
                1,
                cv2.LINE_AA
            )

        return annotated
