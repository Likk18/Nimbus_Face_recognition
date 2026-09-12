from typing import List, Union, Optional
from pathlib import Path
import cv2
import numpy as np

from backend.src import config

try:
    import onnxruntime as ort
    HAS_ONNX = True
except ImportError:
    HAS_ONNX = False

class FaceEmbedder:
    def __init__(self, model_path: Optional[Path] = None):
        self.model_path = Path(model_path) if model_path else config.FACENET_ONNX_PATH
        self.use_onnx = False
        self.session = None
        self.torch_model = None

        if HAS_ONNX and self.model_path.exists():
            try:
                # Optimized ONNX Runtime Session
                opts = ort.SessionOptions()
                opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                opts.intra_op_num_threads = 2
                self.session = ort.InferenceSession(
                    str(self.model_path),
                    sess_options=opts,
                    providers=["CPUExecutionProvider"]
                )
                self.input_name = self.session.get_inputs()[0].name
                self.use_onnx = True
            except Exception as e:
                print(f"Warning: Failed to initialize ONNX Runtime session: {e}")

        if not self.use_onnx:
            # PyTorch fallback if ONNX is unavailable
            try:
                import torch
                from facenet_pytorch import InceptionResnetV1
                self.device = config.DEVICE
                self.torch_model = InceptionResnetV1(pretrained="vggface2").eval().to(self.device)
            except Exception as e:
                raise RuntimeError(f"Neither ONNX Runtime nor PyTorch FaceNet model could be initialized: {e}")

    def _preprocess_crop(self, face_rgb: np.ndarray) -> np.ndarray:
        if face_rgb.shape[:2] != config.FACE_IMAGE_SIZE:
            face_rgb = cv2.resize(face_rgb, config.FACE_IMAGE_SIZE, interpolation=cv2.INTER_CUBIC)
        
        # Standardize pixel values to [-1.0, 1.0]
        face_float = (face_rgb.astype(np.float32) - 127.5) / 128.0
        # Transpose from (H, W, C) to (C, H, W)
        tensor = np.transpose(face_float, (2, 0, 1))
        return tensor

    def extract(self, face_image: np.ndarray, is_bgr: bool = True) -> np.ndarray:
        if face_image is None or face_image.size == 0:
            raise ValueError("Input face image is empty.")

        if is_bgr:
            face_rgb = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
        else:
            face_rgb = face_image

        tensor = self._preprocess_crop(face_rgb)
        batch = np.expand_dims(tensor, axis=0).astype(np.float32)

        if self.use_onnx and self.session:
            outputs = self.session.run(None, {self.input_name: batch})
            raw_emb = outputs[0].flatten()
        else:
            import torch
            torch_tensor = torch.from_numpy(batch).to(self.device)
            with torch.no_grad():
                raw_emb = self.torch_model(torch_tensor).cpu().numpy().flatten()

        # L2-normalize vector to unit sphere
        norm = np.linalg.norm(raw_emb)
        if norm > 1e-10:
            normalized_emb = raw_emb / norm
        else:
            normalized_emb = raw_emb

        return normalized_emb.astype(np.float32)

    def extract_batch(self, face_images: List[np.ndarray], is_bgr: bool = True) -> np.ndarray:
        if not face_images:
            return np.empty((0, config.EMBEDDING_DIM), dtype=np.float32)

        tensors = []
        for img in face_images:
            if img is None or img.size == 0:
                continue
            if is_bgr:
                rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            else:
                rgb = img
            tensors.append(self._preprocess_crop(rgb))

        if not tensors:
            return np.empty((0, config.EMBEDDING_DIM), dtype=np.float32)

        batch = np.stack(tensors, axis=0).astype(np.float32)

        if self.use_onnx and self.session:
            outputs = self.session.run(None, {self.input_name: batch})
            raw_embs = outputs[0]
        else:
            import torch
            torch_tensor = torch.from_numpy(batch).to(self.device)
            with torch.no_grad():
                raw_embs = self.torch_model(torch_tensor).cpu().numpy()

        norms = np.linalg.norm(raw_embs, axis=1, keepdims=True)
        norms = np.clip(norms, a_min=1e-10, a_max=None)
        normalized_embs = raw_embs / norms

        return normalized_embs.astype(np.float32)
