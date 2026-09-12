import os
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import cv2
import numpy as np
from backend.src import config
from backend.src.database import GalleryDatabase, FaceProfile

def generate_sample_face_image(name: str, variation: int = 0) -> np.ndarray:
    """
    Generates a clean synthetic face image with discernible facial features
    (eyes, nose, mouth) and color signatures for testing detector & pipeline.
    """
    img = np.ones((240, 240, 3), dtype=np.uint8) * 230
    
    # Skin color base with unique hue per name
    seed = sum(ord(c) for c in name) + variation * 37
    np.random.seed(seed)
    
    skin_tone = (
        int(np.clip(180 + np.random.randint(-15, 15), 100, 240)),
        int(np.clip(200 + np.random.randint(-15, 15), 120, 245)),
        int(np.clip(235 + np.random.randint(-15, 15), 140, 255))
    )
    
    # Draw oval face shape
    center = (120 + variation * 2, 120 + variation)
    axes = (65, 85)
    cv2.ellipse(img, center, axes, 0, 0, 360, skin_tone, -1)
    cv2.ellipse(img, center, axes, 0, 0, 360, (140, 160, 200), 2)
    
    # Eyes
    eye_y = 100 + variation
    left_eye_x = 95 + variation
    right_eye_x = 145 + variation
    cv2.circle(img, (left_eye_x, eye_y), 8, (255, 255, 255), -1)
    cv2.circle(img, (left_eye_x, eye_y), 4, (60, 40, 20), -1)
    cv2.circle(img, (right_eye_x, eye_y), 8, (255, 255, 255), -1)
    cv2.circle(img, (right_eye_x, eye_y), 4, (60, 40, 20), -1)
    
    # Nose
    nose_pts = np.array([
        [120 + variation, 115],
        [115 + variation, 135],
        [125 + variation, 135]
    ], np.int32)
    cv2.polylines(img, [nose_pts], True, (130, 150, 180), 2)
    
    # Mouth
    cv2.ellipse(img, (120 + variation, 160), (20, 8), 0, 0, 180, (50, 60, 180), 2)
    
    return img

def setup_baseline_data():
    config.ensure_directories()
    
    subjects = ["Alex_Morgan", "Sophia_Chen", "Marcus_Vance", "Elena_Rostova"]
    
    # 1. Create raw enrollment images
    print("Generating raw enrollment multi-shot images...")
    for sub in subjects:
        sub_dir = config.RAW_ENROLLMENT_DIR / sub
        sub_dir.mkdir(parents=True, exist_ok=True)
        for i in range(3):
            img = generate_sample_face_image(sub, variation=i)
            cv2.imwrite(str(sub_dir / f"shot_{i+1}.jpg"), img)
            
    # 2. Create test dataset (known and unknown)
    print("Generating test dataset images (known and unknown)...")
    for sub in subjects:
        known_sub_dir = config.TEST_DATASET_DIR / "known" / sub
        known_sub_dir.mkdir(parents=True, exist_ok=True)
        for i in range(4):
            img = generate_sample_face_image(sub, variation=i + 5)
            cv2.imwrite(str(known_sub_dir / f"test_known_{i+1}.jpg"), img)
            
    # Unknown impostor subjects
    unknown_subjects = ["Impostor_Alpha", "Impostor_Bravo", "Impostor_Charlie"]
    unknown_dir = config.TEST_DATASET_DIR / "unknown"
    unknown_dir.mkdir(parents=True, exist_ok=True)
    for unk in unknown_subjects:
        for i in range(3):
            img = generate_sample_face_image(unk, variation=i + 10)
            cv2.imwrite(str(unknown_dir / f"{unk}_{i+1}.jpg"), img)

    # 3. Seed initial gallery database with high-quality normalized centroid vectors
    print("Populating baseline gallery.json...")
    db = GalleryDatabase()
    np.random.seed(1337)
    for i, sub in enumerate(subjects):
        # Deterministic orthogonal seed vectors with distinct subspace
        vec = np.zeros(512, dtype=np.float32)
        vec[i * 50:(i + 1) * 50] = 1.0
        vec += np.random.normal(0, 0.05, 512).astype(np.float32)
        vec /= np.linalg.norm(vec)
        db.enroll_person(sub, [vec])
        
    print(f"Successfully seeded {len(db.profiles)} profiles into {config.GALLERY_FILE}")

if __name__ == "__main__":
    setup_baseline_data()
