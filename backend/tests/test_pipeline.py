import numpy as np
import pytest
from backend.src.pipeline import InferencePipeline
from backend.src.database import GalleryDatabase

def test_pipeline_empty_image():
    pipeline = InferencePipeline()
    res = pipeline.process_image(None)
    assert res["num_faces"] == 0
    assert res["faces"] == []

    empty = np.zeros((0, 0, 3), dtype=np.uint8)
    res_empty = pipeline.process_image(empty)
    assert res_empty["num_faces"] == 0

def test_pipeline_annotation():
    pipeline = InferencePipeline()
    img = np.zeros((300, 300, 3), dtype=np.uint8)
    
    mock_results = {
        "num_faces": 1,
        "faces": [{
            "bbox": [50, 50, 150, 150],
            "landmarks": [[75, 80], [125, 80], [100, 105], [80, 130], [120, 130]],
            "is_recognized": True,
            "predicted_name": "TestUser",
            "similarity_score": 0.95
        }]
    }
    annotated = pipeline.annotate_image(img, mock_results)
    assert annotated.shape == (300, 300, 3)
    # Check that image pixels were modified by the annotation
    assert np.sum(annotated) > 0
