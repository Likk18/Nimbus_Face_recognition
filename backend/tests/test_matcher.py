import numpy as np
import pytest
from backend.src.database import GalleryDatabase
from backend.src.matcher import FaceMatcher, MatchResult

def test_matcher_recognition_and_rejection(tmp_path):
    temp_file = tmp_path / "gallery_matcher.json"
    db = GalleryDatabase(file_path=temp_file)

    # Enroll subject A and subject B with orthogonal vectors
    vec_a = np.zeros(512, dtype=np.float32)
    vec_a[0] = 1.0  # Unit vector on axis 0
    db.enroll_person("Alice", [vec_a])

    vec_b = np.zeros(512, dtype=np.float32)
    vec_b[1] = 1.0  # Unit vector on axis 1
    db.enroll_person("Bob", [vec_b])

    matcher = FaceMatcher(database=db)

    # 1. Query close to Alice (similarity ~0.95)
    query_alice = np.copy(vec_a)
    query_alice[2] = 0.3
    query_alice /= np.linalg.norm(query_alice)

    res_alice = matcher.match(query_alice, threshold=0.65)
    assert res_alice.is_recognized is True
    assert res_alice.predicted_name == "Alice"
    assert res_alice.confidence > 0.90
    assert len(res_alice.top_candidates) == 2
    assert res_alice.top_candidates[0].name == "Alice"

    # 2. Query representing an unknown impostor (orthogonal to both A and B)
    query_unknown = np.zeros(512, dtype=np.float32)
    query_unknown[100] = 1.0

    res_unknown = matcher.match(query_unknown, threshold=0.65)
    assert res_unknown.is_recognized is False
    assert res_unknown.predicted_name == "UNKNOWN"
    assert res_unknown.confidence < 0.10

    # 3. Dynamic threshold tuning test
    # If threshold is lowered to 0.0, the best candidate should be selected
    res_lenient = matcher.match(query_unknown, threshold=0.0)
    assert res_lenient.is_recognized is True

def test_matcher_empty_gallery(tmp_path):
    temp_file = tmp_path / "gallery_empty.json"
    db = GalleryDatabase(file_path=temp_file)
    matcher = FaceMatcher(database=db)

    query = np.random.randn(512).astype(np.float32)
    res = matcher.match(query)
    assert res.is_recognized is False
    assert res.predicted_name == "UNKNOWN"
    assert res.top_candidates == []
