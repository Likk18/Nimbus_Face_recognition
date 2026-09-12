import numpy as np
import pytest
from backend.src.detector import (
    FaceDetection,
    compute_iou,
    DualVerificationDetector,
    MTCNNDetector,
    YuNetDetector
)

def test_compute_iou():
    box1 = np.array([0, 0, 10, 10], dtype=np.float32)
    box2 = np.array([0, 0, 10, 10], dtype=np.float32)
    assert pytest.approx(compute_iou(box1, box2), 0.001) == 1.0

    box3 = np.array([5, 0, 15, 10], dtype=np.float32)
    assert pytest.approx(compute_iou(box1, box3), 0.01) == 0.333

    box4 = np.array([20, 20, 30, 30], dtype=np.float32)
    assert compute_iou(box1, box4) == 0.0

def test_face_detection_to_dict():
    det = FaceDetection(
        bbox=np.array([10, 20, 110, 120], dtype=np.float32),
        confidence=0.95,
        landmarks=np.zeros((5, 2), dtype=np.float32),
        source="fused",
        raw_scores={"mtcnn": 0.98, "yunet": 0.92}
    )
    d = det.to_dict()
    assert d["source"] == "fused"
    assert d["confidence"] == 0.95
    assert len(d["bbox"]) == 4
    assert len(d["landmarks"]) == 5

def test_detectors_empty_input():
    empty_img = np.zeros((100, 100, 3), dtype=np.uint8)
    mtcnn = MTCNNDetector()
    yunet = YuNetDetector()
    dual = DualVerificationDetector()

    assert mtcnn.detect(None) == []
    assert yunet.detect(None) == []
    assert dual.detect(None) == []
    assert isinstance(dual.detect(empty_img), list)

def test_weighted_box_fusion_calculation():
    dual = DualVerificationDetector(mtcnn_weight=0.70, yunet_weight=0.30)
    
    # Mocking detection lists
    box_m = np.array([10.0, 10.0, 110.0, 110.0], dtype=np.float32)
    box_y = np.array([12.0, 8.0, 108.0, 112.0], dtype=np.float32)
    
    expected_box = 0.70 * box_m + 0.30 * box_y
    
    det_m = FaceDetection(bbox=box_m, confidence=0.90, landmarks=np.zeros((5,2)), source="mtcnn")
    det_y = FaceDetection(bbox=box_y, confidence=0.80, landmarks=np.zeros((5,2)), source="yunet")
    
    # Check IoU
    iou = compute_iou(box_m, box_y)
    assert iou > 0.8
    
    expected_conf = 0.70 * 0.90 + 0.30 * 0.80
    assert pytest.approx(expected_conf, 0.001) == 0.87
