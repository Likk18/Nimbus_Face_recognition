from typing import List, Union
import cv2
import numpy as np
import torch
from facenet_pytorch import InceptionResnetV1
from backend.src import config

class FaceEmbedder:
    def __init__(self, pretrained: str = "vggface2", device: str = config.DEVICE):
        self.device = device
        self.model = InceptionResnetV1(pretrained=pretrained).eval().to(self.device)

    def _preprocess_crop(self, face_rgb: np.ndarray) -> torch.Tensor:
        if face_rgb.shape[:2] != config.FACE_IMAGE_SIZE:
            face_rgb = cv2.resize(face_rgb, config.FACE_IMAGE_SIZE, interpolation=cv2.INTER_CUBIC)
        
        # Standardize pixel values to [-1.0, 1.0]
        face_float = (face_rgb.astype(np.float32) - 127.5) / 128.0
        # Transpose to (C, H, W)
        tensor = torch.from_numpy(face_float).permute(2, 0, 1).float()
        return tensor

    def extract(self, face_image: np.ndarray, is_bgr: bool = True) -> np.ndarray:
        if face_image is None or face_image.size == 0:
            raise ValueError("Input face image is empty.")

        if is_bgr:
            face_rgb = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
        else:
            face_rgb = face_image

        tensor = self._preprocess_crop(face_rgb).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            embedding = self.model(tensor)
            # L2 normalize
            norm = torch.norm(embedding, p=2, dim=1, keepdim=True)
            normalized_emb = embedding / torch.clamp(norm, min=1e-10)
        
        return normalized_emb.cpu().numpy().flatten().astype(np.float32)

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

        batch_tensor = torch.stack(tensors).to(self.device)

        with torch.no_grad():
            embeddings = self.model(batch_tensor)
            norms = torch.norm(embeddings, p=2, dim=1, keepdim=True)
            normalized_embs = embeddings / torch.clamp(norms, min=1e-10)

        return normalized_embs.cpu().numpy().astype(np.float32)
