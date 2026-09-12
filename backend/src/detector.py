import os
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
import cv2
import numpy as np
from PIL import Image

from backend.src import config

try:
    from facenet_pytorch import MTCNN
    import torch
    HAS_MTCNN = True
except ImportError:
    HAS_MTCNN = False

@dataclass
class FaceDetection:
    bbox: np.ndarray  # [x1, y1, x2, y2]
    confidence: float
    landmarks: np.ndarray  # (5, 2): [left_eye, right_eye, nose, mouth_l, mouth_r]
    source: str  # "fused", "fallback_mtcnn", "fallback_yunet", "mtcnn", "yunet"
    raw_scores: Dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bbox": [float(v) for v in self.bbox],
            "confidence": float(self.confidence),
            "landmarks": [[float(p[0]), float(p[1])] for p in self.landmarks],
            "source": self.source,
            "raw_scores": self.raw_scores
        }


def compute_iou(box1: np.ndarray, box2: np.ndarray) -> float:
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_w = max(0.0, x2 - x1)
    inter_h = max(0.0, y2 - y1)
    inter_area = inter_w * inter_h

    area1 = max(0.0, (box1[2] - box1[0]) * (box1[3] - box1[1]))
    area2 = max(0.0, (box2[2] - box2[0]) * (box2[3] - box2[1]))
    union_area = area1 + area2 - inter_area

    if union_area <= 0.0:
        return 0.0
    return float(inter_area / union_area)


class MTCNNDetector:
    def __init__(self, device: str = config.DEVICE):
        self.device = device
        self.mtcnn = None
        if HAS_MTCNN:
            try:
                self.mtcnn = MTCNN(
                    keep_all=True,
                    device=self.device,
                    min_face_size=config.MTCNN_MIN_FACE_SIZE,
                    thresholds=[0.6, 0.7, config.MTCNN_CONF_THRESHOLD],
                    post_process=False
                )
            except Exception as e:
                print(f"Notice: MTCNN initialization skipped: {e}")

    def detect(self, image_bgr: np.ndarray) -> List[FaceDetection]:
        if not HAS_MTCNN or self.mtcnn is None or image_bgr is None or image_bgr.size == 0:
            return []
        
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(image_rgb)
        
        boxes, probs, landmarks = self.mtcnn.detect(pil_img, landmarks=True)
        if boxes is None or len(boxes) == 0:
            return []

        h, w = image_bgr.shape[:2]
        detections = []
        for bbox, prob, lms in zip(boxes, probs, landmarks):
            if prob is None or prob < config.MTCNN_CONF_THRESHOLD:
                continue
            
            # Clip bounding box
            x1 = max(0.0, min(float(bbox[0]), float(w - 1)))
            y1 = max(0.0, min(float(bbox[1]), float(h - 1)))
            x2 = max(0.0, min(float(bbox[2]), float(w - 1)))
            y2 = max(0.0, min(float(bbox[3]), float(h - 1)))
            
            if (x2 - x1) < 10 or (y2 - y1) < 10:
                continue

            lms_arr = np.asarray(lms, dtype=np.float32)  # shape (5, 2)
            detections.append(FaceDetection(
                bbox=np.array([x1, y1, x2, y2], dtype=np.float32),
                confidence=float(prob),
                landmarks=lms_arr,
                source="mtcnn",
                raw_scores={"mtcnn": float(prob)}
            ))
        return detections


class YuNetDetector:
    def __init__(self, model_path: Optional[str] = None):
        config.ensure_directories()
        self.model_path = Path(model_path) if model_path else config.YUNET_MODEL_PATH
        if not self.model_path.exists():
            print(f"Downloading YuNet ONNX model to {self.model_path}...")
            urllib.request.urlretrieve(config.YUNET_MODEL_URL, str(self.model_path))

        self.score_thresh = config.YUNET_SCORE_THRESHOLD
        self.nms_thresh = config.YUNET_NMS_THRESHOLD
        self.detector = cv2.FaceDetectorYN.create(
            str(self.model_path),
            "",
            (320, 320),
            self.score_thresh,
            self.nms_thresh,
            5000
        )

    def detect(self, image_bgr: np.ndarray) -> List[FaceDetection]:
        if image_bgr is None or image_bgr.size == 0:
            return []
        
        h, w = image_bgr.shape[:2]
        self.detector.setInputSize((w, h))
        
        _, faces = self.detector.detect(image_bgr)
        if faces is None or len(faces) == 0:
            return []

        detections = []
        for face in faces:
            score = float(face[-1])
            if score < self.score_thresh:
                continue

            x = float(face[0])
            y = float(face[1])
            bw = float(face[2])
            bh = float(face[3])

            x1 = max(0.0, min(x, float(w - 1)))
            y1 = max(0.0, min(y, float(h - 1)))
            x2 = max(0.0, min(x + bw, float(w - 1)))
            y2 = max(0.0, min(y + bh, float(h - 1)))

            # YuNet 5 landmarks: right eye, left eye, nose, right mouth, left mouth
            # Notice YuNet orders: [right_eye (4,5), left_eye (6,7), nose (8,9), right_mouth (10,11), left_mouth (12,13)]
            # We standardize to: [left_eye, right_eye, nose, left_mouth, right_mouth]
            r_eye = [float(face[4]), float(face[5])]
            l_eye = [float(face[6]), float(face[7])]
            nose = [float(face[8]), float(face[9])]
            r_mouth = [float(face[10]), float(face[11])]
            l_mouth = [float(face[12]), float(face[13])]

            lms_arr = np.array([l_eye, r_eye, nose, l_mouth, r_mouth], dtype=np.float32)

            detections.append(FaceDetection(
                bbox=np.array([x1, y1, x2, y2], dtype=np.float32),
                confidence=score,
                landmarks=lms_arr,
                source="yunet",
                raw_scores={"yunet": score}
            ))
        return detections


class DualVerificationDetector:
    def __init__(
        self,
        mtcnn_weight: float = config.MTCNN_WEIGHT,
        yunet_weight: float = config.YUNET_WEIGHT,
        iou_threshold: float = config.WBF_IOU_THRESHOLD,
        device: str = config.DEVICE
    ):
        self.mtcnn_weight = mtcnn_weight
        self.yunet_weight = yunet_weight
        self.iou_threshold = iou_threshold
        self.mtcnn = MTCNNDetector(device=device)
        self.yunet = YuNetDetector()
        self.executor = ThreadPoolExecutor(max_workers=2)

    def detect(self, image_bgr: np.ndarray) -> List[FaceDetection]:
        if image_bgr is None or image_bgr.size == 0:
            return []

        # Execute both detectors concurrently
        future_mtcnn = self.executor.submit(self.mtcnn.detect, image_bgr)
        future_yunet = self.executor.submit(self.yunet.detect, image_bgr)

        mtcnn_dets = future_mtcnn.result()
        yunet_dets = future_yunet.result()

        matched_mtcnn = set()
        matched_yunet = set()
        fused_detections: List[FaceDetection] = []

        # Match pairs with IoU >= threshold
        for m_idx, m_det in enumerate(mtcnn_dets):
            best_iou = 0.0
            best_y_idx = -1
            for y_idx, y_det in enumerate(yunet_dets):
                if y_idx in matched_yunet:
                    continue
                iou = compute_iou(m_det.bbox, y_det.bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_y_idx = y_idx

            if best_iou >= self.iou_threshold and best_y_idx >= 0:
                y_det = yunet_dets[best_y_idx]
                matched_mtcnn.add(m_idx)
                matched_yunet.add(best_y_idx)

                # Weighted Box Fusion (WBF)
                fused_box = (self.mtcnn_weight * m_det.bbox) + (self.yunet_weight * y_det.bbox)
                fused_lms = (self.mtcnn_weight * m_det.landmarks) + (self.yunet_weight * y_det.landmarks)
                fused_conf = (self.mtcnn_weight * m_det.confidence) + (self.yunet_weight * y_det.confidence)

                fused_detections.append(FaceDetection(
                    bbox=fused_box,
                    confidence=float(fused_conf),
                    landmarks=fused_lms,
                    source="fused",
                    raw_scores={
                        "mtcnn": float(m_det.confidence),
                        "yunet": float(y_det.confidence),
                        "iou": float(best_iou)
                    }
                ))

        # Handle unmatched MTCNN detections (graceful fallback)
        for m_idx, m_det in enumerate(mtcnn_dets):
            if m_idx not in matched_mtcnn and m_det.confidence >= config.MTCNN_CONF_THRESHOLD:
                fused_detections.append(FaceDetection(
                    bbox=m_det.bbox,
                    confidence=float(m_det.confidence * self.mtcnn_weight),
                    landmarks=m_det.landmarks,
                    source="fallback_mtcnn",
                    raw_scores={"mtcnn": float(m_det.confidence), "yunet": 0.0}
                ))

        # Handle unmatched YuNet detections (graceful fallback only on high confidence)
        for y_idx, y_det in enumerate(yunet_dets):
            if y_idx not in matched_yunet and y_det.confidence >= config.YUNET_SOLO_CONFIDENCE_THRESHOLD:
                fused_detections.append(FaceDetection(
                    bbox=y_det.bbox,
                    confidence=float(y_det.confidence * self.yunet_weight),
                    landmarks=y_det.landmarks,
                    source="fallback_yunet",
                    raw_scores={"mtcnn": 0.0, "yunet": float(y_det.confidence)}
                ))

        return fused_detections
