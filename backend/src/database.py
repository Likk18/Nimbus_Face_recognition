import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import numpy as np

from backend.src import config

class FaceProfile:
    def __init__(
        self,
        name: str,
        embedding: List[float],
        num_shots: int = 1,
        created_at: Optional[str] = None,
        updated_at: Optional[str] = None
    ):
        self.name = name.strip()
        self.embedding = [float(x) for x in embedding]
        self.num_shots = int(num_shots)
        now_str = datetime.now(timezone.utc).isoformat()
        self.created_at = created_at or now_str
        self.updated_at = updated_at or now_str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "embedding": self.embedding,
            "num_shots": self.num_shots,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FaceProfile":
        return cls(
            name=data["name"],
            embedding=data["embedding"],
            num_shots=data.get("num_shots", 1),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at")
        )

    def get_numpy_embedding(self) -> np.ndarray:
        arr = np.array(self.embedding, dtype=np.float32)
        norm = np.linalg.norm(arr)
        if norm > 1e-6:
            arr = arr / norm
        return arr


class GalleryDatabase:
    def __init__(self, file_path: Optional[Path] = None):
        config.ensure_directories()
        self.file_path = Path(file_path) if file_path else config.GALLERY_FILE
        self.profiles: Dict[str, FaceProfile] = {}
        self.matrix: np.ndarray = np.empty((0, config.EMBEDDING_DIM), dtype=np.float32)
        self.names: List[str] = []
        self.load()

    def load(self) -> None:
        self.profiles = {}
        if self.file_path.exists():
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data.get("profiles", []):
                        profile = FaceProfile.from_dict(item)
                        self.profiles[profile.name] = profile
            except Exception as e:
                print(f"Warning: Failed to load gallery file {self.file_path}: {e}")

        self._rebuild_matrix()

    def _rebuild_matrix(self) -> None:
        if not self.profiles:
            self.matrix = np.empty((0, config.EMBEDDING_DIM), dtype=np.float32)
            self.names = []
            return

        names_list = []
        vectors = []
        for name, profile in self.profiles.items():
            names_list.append(name)
            vectors.append(profile.get_numpy_embedding())

        self.names = names_list
        self.matrix = np.stack(vectors, axis=0).astype(np.float32)

    def save(self) -> None:
        payload = {
            "version": "1.0",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "count": len(self.profiles),
            "profiles": [p.to_dict() for p in self.profiles.values()]
        }
        try:
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
        except OSError:
            # Fallback to /tmp in read-only serverless environment
            tmp_path = config.TMP_DIR / "gallery.json"
            tmp_path.parent.mkdir(parents=True, exist_ok=True)
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
            self.file_path = tmp_path

    def enroll_person(self, name: str, embeddings: List[np.ndarray]) -> FaceProfile:
        name = name.strip()
        if not name:
            raise ValueError("Name cannot be empty.")
        if not embeddings:
            raise ValueError("At least one face embedding is required for enrollment.")

        # Compute centroid average
        stacked = np.stack(embeddings, axis=0)  # (N, 512)
        centroid = np.mean(stacked, axis=0)     # (512,)
        norm = np.linalg.norm(centroid)
        if norm > 1e-6:
            normalized_centroid = centroid / norm
        else:
            normalized_centroid = centroid

        if name in self.profiles:
            # Update existing profile
            existing = self.profiles[name]
            profile = FaceProfile(
                name=name,
                embedding=normalized_centroid.tolist(),
                num_shots=len(embeddings),
                created_at=existing.created_at,
                updated_at=datetime.now(timezone.utc).isoformat()
            )
        else:
            profile = FaceProfile(
                name=name,
                embedding=normalized_centroid.tolist(),
                num_shots=len(embeddings)
            )

        self.profiles[name] = profile
        self.save()
        self._rebuild_matrix()
        return profile

    def delete_person(self, name: str) -> bool:
        name = name.strip()
        if name in self.profiles:
            del self.profiles[name]
            self.save()
            self._rebuild_matrix()
            return True
        return False

    def get_matrix(self) -> Tuple[np.ndarray, List[str]]:
        return self.matrix, self.names

    def list_profiles(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": p.name,
                "num_shots": p.num_shots,
                "created_at": p.created_at,
                "updated_at": p.updated_at
            }
            for p in self.profiles.values()
        ]

    def export_json(self) -> Dict[str, Any]:
        return {
            "version": "1.0",
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "count": len(self.profiles),
            "profiles": [p.to_dict() for p in self.profiles.values()]
        }

    def import_json(self, data: Dict[str, Any]) -> int:
        count = 0
        for item in data.get("profiles", []):
            profile = FaceProfile.from_dict(item)
            self.profiles[profile.name] = profile
            count += 1
        if count > 0:
            self.save()
            self._rebuild_matrix()
        return count
