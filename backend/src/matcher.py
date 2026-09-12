from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

from backend.src import config
from backend.src.database import GalleryDatabase

@dataclass
class MatchCandidate:
    name: str
    similarity: float
    distance: float
    is_match: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "similarity": float(self.similarity),
            "distance": float(self.distance),
            "is_match": bool(self.is_match)
        }


@dataclass
class MatchResult:
    predicted_name: str
    confidence: float
    is_recognized: bool
    top_candidates: List[MatchCandidate] = field(default_factory=list)
    threshold: float = config.DEFAULT_REJECTION_THRESHOLD

    def to_dict(self) -> Dict[str, Any]:
        return {
            "predicted_name": self.predicted_name,
            "confidence": float(self.confidence),
            "is_recognized": bool(self.is_recognized),
            "threshold": float(self.threshold),
            "top_candidates": [c.to_dict() for c in self.top_candidates]
        }


class FaceMatcher:
    def __init__(self, database: Optional[GalleryDatabase] = None):
        self.database = database or GalleryDatabase()

    def match(
        self,
        query_embedding: np.ndarray,
        threshold: Optional[float] = None,
        top_k: int = 3
    ) -> MatchResult:
        tau = float(threshold if threshold is not None else config.DEFAULT_REJECTION_THRESHOLD)
        query = np.asarray(query_embedding, dtype=np.float32).flatten()
        
        q_norm = np.linalg.norm(query)
        if q_norm > 1e-6:
            query = query / q_norm

        matrix, names = self.database.get_matrix()
        if matrix.shape[0] == 0:
            return MatchResult(
                predicted_name="UNKNOWN",
                confidence=0.0,
                is_recognized=False,
                top_candidates=[],
                threshold=tau
            )

        # Vectorized dot product: S = G @ q
        similarities = np.dot(matrix, query)  # shape (M,)
        
        # Sort in descending order
        sorted_indices = np.argsort(-similarities)
        
        top_candidates = []
        for rank in range(min(top_k, len(names))):
            idx = int(sorted_indices[rank])
            sim = float(similarities[idx])
            dist = float(1.0 - sim)
            top_candidates.append(MatchCandidate(
                name=names[idx],
                similarity=sim,
                distance=dist,
                is_match=(sim >= tau)
            ))

        best_idx = int(sorted_indices[0])
        best_sim = float(similarities[best_idx])

        if best_sim >= tau:
            predicted_name = names[best_idx]
            is_recognized = True
        else:
            predicted_name = "UNKNOWN"
            is_recognized = False

        return MatchResult(
            predicted_name=predicted_name,
            confidence=best_sim,
            is_recognized=is_recognized,
            top_candidates=top_candidates,
            threshold=tau
        )

    def match_batch(
        self,
        query_embeddings: np.ndarray,
        threshold: Optional[float] = None,
        top_k: int = 3
    ) -> List[MatchResult]:
        if query_embeddings.ndim == 1:
            query_embeddings = query_embeddings.reshape(1, -1)
        
        results = []
        for i in range(query_embeddings.shape[0]):
            res = self.match(query_embeddings[i], threshold=threshold, top_k=top_k)
            results.append(res)
        return results
