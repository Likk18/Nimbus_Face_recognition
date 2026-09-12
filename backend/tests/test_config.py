import pytest
from pathlib import Path
from backend.src import config

def test_config_paths():
    assert config.BASE_DIR.exists()
    assert isinstance(config.DATA_DIR, Path)
    assert isinstance(config.GALLERY_FILE, Path)
    assert config.EMBEDDING_DIM == 512
    assert config.FACE_IMAGE_SIZE == (160, 160)

def test_config_weights():
    assert pytest.approx(config.MTCNN_WEIGHT + config.YUNET_WEIGHT, 0.001) == 1.0
    assert config.MTCNN_WEIGHT == 0.70
    assert config.YUNET_WEIGHT == 0.30
    assert 0.0 < config.DEFAULT_REJECTION_THRESHOLD < 1.0

def test_ensure_directories():
    config.ensure_directories()
    assert config.DATA_DIR.exists()
    assert config.GALLERY_DIR.exists()
    assert config.OUTPUTS_DIR.exists()
