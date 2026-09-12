import numpy as np
import cv2
from backend.src.aligner import FaceAligner

def test_aligner_5point():
    aligner = FaceAligner(output_size=(160, 160))
    # Create synthetic test image (200x200 RGB)
    test_img = np.zeros((200, 200, 3), dtype=np.uint8)
    test_img[50:150, 50:150] = [100, 150, 200]
    
    # Synthetic landmarks
    landmarks = np.array([
        [70.0, 80.0],   # left eye
        [130.0, 80.0],  # right eye
        [100.0, 110.0], # nose
        [75.0, 140.0],  # left mouth
        [125.0, 140.0]  # right mouth
    ], dtype=np.float32)

    aligned, angle, trans_mat = aligner.align_face_5point(test_img, landmarks)

    assert aligned.shape == (160, 160, 3)
    assert abs(angle) < 0.1
    assert trans_mat.shape == (2, 3)

def test_aligner_tilted_face():
    aligner = FaceAligner(output_size=(160, 160))
    test_img = np.zeros((300, 300, 3), dtype=np.uint8)
    
    # Tilted landmarks (~30 degree rotation)
    landmarks = np.array([
        [100.0, 100.0],
        [150.0, 130.0],
        [115.0, 140.0],
        [95.0, 160.0],
        [135.0, 180.0]
    ], dtype=np.float32)

    aligned, angle, trans_mat = aligner.align_face_5point(test_img, landmarks)
    assert aligned.shape == (160, 160, 3)
    assert 20.0 < angle < 40.0

def test_aligner_box_fallback():
    aligner = FaceAligner(output_size=(160, 160))
    test_img = np.ones((200, 200, 3), dtype=np.uint8) * 128
    bbox = np.array([30, 40, 150, 160])
    
    crop = aligner.align_from_box_fallback(test_img, bbox)
    assert crop.shape == (160, 160, 3)
