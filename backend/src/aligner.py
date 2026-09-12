import cv2
import numpy as np
from typing import Tuple, Optional, Union
from backend.src import config

REFERENCE_FACIAL_POINTS_160 = np.array([
    [50.4, 73.8],    # Left eye
    [109.6, 73.8],   # Right eye
    [80.0, 102.4],   # Nose tip
    [55.8, 131.8],   # Left mouth corner
    [104.2, 131.8]   # Right mouth corner
], dtype=np.float32)

class FaceAligner:
    def __init__(self, output_size: Tuple[int, int] = config.FACE_IMAGE_SIZE):
        self.output_size = output_size
        if output_size == (160, 160):
            self.ref_points = REFERENCE_FACIAL_POINTS_160
        else:
            scale_x = output_size[0] / 160.0
            scale_y = output_size[1] / 160.0
            self.ref_points = REFERENCE_FACIAL_POINTS_160 * np.array([scale_x, scale_y], dtype=np.float32)

    def align_face_5point(
        self, 
        image: np.ndarray, 
        landmarks: np.ndarray,
        bounding_box: Optional[np.ndarray] = None
    ) -> Tuple[np.ndarray, float, np.ndarray]:
        landmarks = np.asarray(landmarks, dtype=np.float32)
        if landmarks.shape != (5, 2):
            raise ValueError(f"Expected landmarks shape (5, 2), got {landmarks.shape}")

        left_eye = landmarks[0]
        right_eye = landmarks[1]
        dy = right_eye[1] - left_eye[1]
        dx = right_eye[0] - left_eye[0]
        angle = float(np.degrees(np.arctan2(dy, dx)))

        # Estimate optimal similarity transformation (rotation + scale + translation)
        trans_mat, inliers = cv2.estimateAffinePartial2D(landmarks, self.ref_points, method=cv2.LMEDS)
        
        if trans_mat is None:
            # Fallback to 2-point eye alignment if least-squares matrix fails
            eye_center = ((left_eye[0] + right_eye[0]) / 2.0, (left_eye[1] + right_eye[1]) / 2.0)
            dist = np.sqrt(dx ** 2 + dy ** 2)
            desired_dist = self.ref_points[1][0] - self.ref_points[0][0]
            scale = desired_dist / max(dist, 1e-4)

            trans_mat = cv2.getRotationMatrix2D(eye_center, angle, scale)
            t_x = self.output_size[0] * 0.5 - eye_center[0]
            t_y = self.output_size[1] * 0.461 - eye_center[1]
            trans_mat[0, 2] += t_x
            trans_mat[1, 2] += t_y

        aligned = cv2.warpAffine(
            image,
            trans_mat,
            self.output_size,
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE
        )

        return aligned, angle, trans_mat

    def align_from_box_fallback(self, image: np.ndarray, bbox: np.ndarray) -> np.ndarray:
        h, w = image.shape[:2]
        x1, y1, x2, y2 = [int(v) for v in bbox[:4]]
        
        # Add 10% margin
        bw = x2 - x1
        bh = y2 - y1
        x1 = max(0, int(x1 - bw * 0.1))
        y1 = max(0, int(y1 - bh * 0.1))
        x2 = min(w, int(x2 + bw * 0.1))
        y2 = min(h, int(y2 + bh * 0.1))
        
        crop = image[y1:y2, x1:x2]
        if crop.size == 0:
            return cv2.resize(image, self.output_size)
        return cv2.resize(crop, self.output_size, interpolation=cv2.INTER_CUBIC)
