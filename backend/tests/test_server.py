import io
import numpy as np
import cv2
import pytest
from fastapi.testclient import TestClient
from backend.server import app

client = TestClient(app)

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "enrolled_faces_count" in data
    assert "detector_weights" in data

def test_api_gallery_routes():
    res = client.get("/api/gallery")
    assert res.status_code == 200
    assert "count" in res.json()

    # Export
    exp_res = client.get("/api/gallery/export")
    assert exp_res.status_code == 200
    assert "profiles" in exp_res.json()

def test_api_identify_empty_image():
    # Synthetic image encoded as JPEG
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buffer = cv2.imencode(".jpg", img)
    
    response = client.post(
        "/api/identify?threshold=0.65",
        files={"file": ("test.jpg", io.BytesIO(buffer.tobytes()), "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "num_faces" in data
    assert "latency_ms" in data
    assert data["num_faces"] == 0

def test_api_evaluate():
    res = client.post("/api/evaluate")
    assert res.status_code == 200
    data = res.json()
    assert "optimal_threshold_eer" in data
    assert "roc_auc" in data
    assert "sweep_results" in data
