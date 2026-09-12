import io
import json
import os
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from typing import List, Optional, Dict, Any
import cv2
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import numpy as np
from pydantic import BaseModel

from backend.src import config
from backend.src.database import GalleryDatabase
from backend.src.pipeline import InferencePipeline
from backend.evaluate import BiometricEvaluator

app = FastAPI(
    title="Nimbus Face Recognition API",
    description="Enterprise Dual-Verification Face Recognition REST API",
    version="1.0.0"
)

allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "*")
allowed_origins = [orig.strip() for orig in allowed_origins_env.split(",") if orig.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

config.ensure_directories()
pipeline = InferencePipeline()
evaluator = BiometricEvaluator(database=pipeline.database)

class ImportGalleryRequest(BaseModel):
    version: Optional[str] = "1.0"
    profiles: List[Dict[str, Any]]

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Nimbus Face Recognition API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "api_health": "/api/health",
            "docs": "/docs"
        }
    }

@app.get("/health")
def root_health():
    return {"status": "healthy"}

@app.get("/api/health")
def get_health():
    mat, names = pipeline.database.get_matrix()
    return {
        "status": "healthy",
        "device": config.DEVICE,
        "embedding_dim": config.EMBEDDING_DIM,
        "detector_weights": {
            "mtcnn": config.MTCNN_WEIGHT,
            "yunet": config.YUNET_WEIGHT
        },
        "default_threshold": config.DEFAULT_REJECTION_THRESHOLD,
        "enrolled_faces_count": len(names)
    }

@app.post("/api/identify")
async def identify_face(
    file: UploadFile = File(...),
    threshold: float = Query(config.DEFAULT_REJECTION_THRESHOLD, ge=0.0, le=1.0)
):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image_bgr is None:
        raise HTTPException(status_code=400, detail="Invalid image data uploaded.")

    result = pipeline.process_image(image_bgr, threshold=threshold)
    return result

@app.post("/api/enroll")
async def enroll_face(
    name: str = Form(...),
    files: List[UploadFile] = File(...)
):
    if not name.strip():
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
    if not files:
        raise HTTPException(status_code=400, detail="At least one image file must be uploaded.")

    images_bgr = []
    for file in files:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is not None:
            images_bgr.append(img)

    if not images_bgr:
        raise HTTPException(status_code=400, detail="Could not decode any of the uploaded images.")

    try:
        enroll_res = pipeline.enroll_from_images(name.strip(), images_bgr)
        return {"status": "success", "profile": enroll_res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/gallery")
def get_gallery():
    profiles = pipeline.database.list_profiles()
    return {
        "count": len(profiles),
        "profiles": profiles
    }

@app.delete("/api/gallery/{name}")
def delete_person(name: str):
    success = pipeline.database.delete_person(name)
    if not success:
        raise HTTPException(status_code=404, detail=f"Subject '{name}' not found.")
    return {"status": "success", "deleted": name}

@app.get("/api/gallery/export")
def export_gallery():
    return pipeline.database.export_json()

@app.post("/api/gallery/import")
def import_gallery(payload: ImportGalleryRequest):
    count = pipeline.database.import_json(payload.model_dump())
    return {"status": "success", "imported_count": count}

@app.post("/api/evaluate")
def run_evaluation():
    try:
        summary = evaluator.evaluate()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/outputs/{filename}")
def get_output_file(filename: str):
    file_path = config.OUTPUTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(file_path)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.server:app", host="0.0.0.0", port=port, reload=False)
