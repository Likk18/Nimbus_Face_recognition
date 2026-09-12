import os
import tempfile
from pathlib import Path
import torch

BASE_DIR = Path(__file__).resolve().parent.parent

# Check if running in a serverless environment (e.g., Vercel / AWS Lambda)
IS_VERCEL = "VERCEL" in os.environ or "AWS_LAMBDA_FUNCTION_NAME" in os.environ

DATA_DIR = BASE_DIR / "data"
GALLERY_DIR = DATA_DIR / "gallery"
GALLERY_FILE = GALLERY_DIR / "gallery.json"
RAW_ENROLLMENT_DIR = DATA_DIR / "raw_enrollment"
TEST_DATASET_DIR = DATA_DIR / "test_dataset"
OUTPUTS_DIR = BASE_DIR / "outputs"
MODELS_DIR = BASE_DIR / "models"

# If in serverless environment, fallback writable paths to /tmp
TMP_DIR = Path(tempfile.gettempdir()) / "nimbus"
if IS_VERCEL:
    OUTPUTS_DIR = TMP_DIR / "outputs"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

FACE_IMAGE_SIZE = (160, 160)
EMBEDDING_DIM = 512

MTCNN_WEIGHT = 0.70
YUNET_WEIGHT = 0.30
WBF_IOU_THRESHOLD = 0.45

MTCNN_CONF_THRESHOLD = 0.80
MTCNN_MIN_FACE_SIZE = 20
YUNET_SCORE_THRESHOLD = 0.60
YUNET_NMS_THRESHOLD = 0.30
YUNET_SOLO_CONFIDENCE_THRESHOLD = 0.85

DEFAULT_REJECTION_THRESHOLD = 0.65

YUNET_MODEL_FILENAME = "face_detection_yunet_2023mar.onnx"
YUNET_MODEL_PATH = MODELS_DIR / YUNET_MODEL_FILENAME
if IS_VERCEL and not YUNET_MODEL_PATH.exists():
    YUNET_MODEL_PATH = TMP_DIR / "models" / YUNET_MODEL_FILENAME
YUNET_MODEL_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"

def ensure_directories():
    for directory in [DATA_DIR, GALLERY_DIR, RAW_ENROLLMENT_DIR, TEST_DATASET_DIR, OUTPUTS_DIR, MODELS_DIR]:
        try:
            directory.mkdir(parents=True, exist_ok=True)
        except OSError:
            # Fallback for read-only serverless filesystem
            fallback = TMP_DIR / directory.name
            fallback.mkdir(parents=True, exist_ok=True)
