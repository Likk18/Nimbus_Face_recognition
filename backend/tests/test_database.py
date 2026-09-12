import numpy as np
import pytest
from pathlib import Path
from backend.src.database import GalleryDatabase, FaceProfile

def test_gallery_crud(tmp_path):
    temp_file = tmp_path / "gallery_test.json"
    db = GalleryDatabase(file_path=temp_file)
    
    assert len(db.profiles) == 0
    mat, names = db.get_matrix()
    assert mat.shape == (0, 512)
    assert len(names) == 0

    # Multi-shot synthetic embeddings for Alice
    vec1 = np.random.randn(512).astype(np.float32)
    vec1 /= np.linalg.norm(vec1)
    vec2 = np.random.randn(512).astype(np.float32)
    vec2 /= np.linalg.norm(vec2)

    profile = db.enroll_person("Alice", [vec1, vec2])
    assert profile.name == "Alice"
    assert profile.num_shots == 2
    assert len(profile.embedding) == 512

    # Check matrix
    mat, names = db.get_matrix()
    assert mat.shape == (1, 512)
    assert names == ["Alice"]

    # Verify centroid norm is 1.0
    assert pytest.approx(float(np.linalg.norm(mat[0])), 0.001) == 1.0

    # Test file reload
    db2 = GalleryDatabase(file_path=temp_file)
    assert "Alice" in db2.profiles
    assert db2.profiles["Alice"].num_shots == 2

    # Test deletion
    deleted = db2.delete_person("Alice")
    assert deleted is True
    assert len(db2.profiles) == 0
    mat2, names2 = db2.get_matrix()
    assert mat2.shape == (0, 512)

def test_gallery_import_export(tmp_path):
    temp_file = tmp_path / "gallery_test.json"
    db = GalleryDatabase(file_path=temp_file)

    v1 = np.random.randn(512).astype(np.float32)
    v1 /= np.linalg.norm(v1)
    db.enroll_person("Bob", [v1])

    exported = db.export_json()
    assert exported["count"] == 1
    assert exported["profiles"][0]["name"] == "Bob"

    temp_file2 = tmp_path / "gallery_test2.json"
    db2 = GalleryDatabase(file_path=temp_file2)
    imported_count = db2.import_json(exported)
    assert imported_count == 1
    assert "Bob" in db2.profiles
