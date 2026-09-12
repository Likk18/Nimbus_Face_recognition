import numpy as np
import pytest
from backend.src.embedder import FaceEmbedder
from backend.src import config

def test_embedder_single_crop():
    embedder = FaceEmbedder()
    dummy_crop = np.random.randint(0, 256, (160, 160, 3), dtype=np.uint8)
    
    vec = embedder.extract(dummy_crop, is_bgr=True)
    
    assert isinstance(vec, np.ndarray)
    assert vec.shape == (config.EMBEDDING_DIM,)
    # Verify L2 norm is ~ 1.0
    l2_norm = float(np.linalg.norm(vec))
    assert pytest.approx(l2_norm, 0.001) == 1.0

def test_embedder_batch():
    embedder = FaceEmbedder()
    crops = [
        np.random.randint(0, 256, (160, 160, 3), dtype=np.uint8),
        np.random.randint(0, 256, (160, 160, 3), dtype=np.uint8),
        np.random.randint(0, 256, (160, 160, 3), dtype=np.uint8)
    ]
    
    mat = embedder.extract_batch(crops, is_bgr=True)
    
    assert isinstance(mat, np.ndarray)
    assert mat.shape == (3, config.EMBEDDING_DIM)
    for i in range(3):
        assert pytest.approx(float(np.linalg.norm(mat[i])), 0.001) == 1.0

def test_embedder_empty_crop():
    embedder = FaceEmbedder()
    with pytest.raises(ValueError):
        embedder.extract(np.zeros((0, 0, 3), dtype=np.uint8))
