import argparse
import os
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import cv2
import numpy as np

from backend.src import config
from backend.src.database import GalleryDatabase
from backend.src.pipeline import InferencePipeline
from backend.evaluate import BiometricEvaluator

def handle_enroll(args):
    pipeline = InferencePipeline()
    img_paths = []
    
    for path_str in args.images:
        p = Path(path_str)
        if p.is_dir():
            for f in p.glob("*.*"):
                if f.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]:
                    img_paths.append(f)
        elif p.is_file():
            img_paths.append(p)

    if not img_paths:
        print(f"Error: No valid images found at specified paths: {args.images}")
        sys.exit(1)

    images = []
    for p in img_paths:
        img = cv2.imread(str(p))
        if img is not None:
            images.append(img)

    print(f"Enrolling '{args.name}' with {len(images)} images...")
    try:
        res = pipeline.enroll_from_images(args.name, images)
        print("Enrollment Successful:")
        print(f"  Name: {res['name']}")
        print(f"  Averaged Shots: {res['num_shots']}")
        print(f"  Gallery file: {config.GALLERY_FILE}")
    except Exception as e:
        print(f"Enrollment Failed: {e}")
        sys.exit(1)

def handle_identify(args):
    pipeline = InferencePipeline()
    img_path = Path(args.image)
    if not img_path.exists():
        print(f"Error: Image not found: {img_path}")
        sys.exit(1)

    img = cv2.imread(str(img_path))
    if img is None:
        print(f"Error: Could not read image: {img_path}")
        sys.exit(1)

    threshold = args.threshold if args.threshold is not None else config.DEFAULT_REJECTION_THRESHOLD
    print(f"Processing '{img_path.name}' (Threshold tau={threshold:.2f})...")

    results = pipeline.process_image(img, threshold=threshold)
    print(f"\nInference complete in {results['latency_ms']} ms. Found {results['num_faces']} face(s):")
    print("-" * 75)
    print(f"{'#':<3} {'Identity':<15} {'Status':<12} {'Confidence':<12} {'Detector':<15} {'Tilt'}")
    print("-" * 75)

    for i, face in enumerate(results["faces"], 1):
        status = "RECOGNIZED" if face["is_recognized"] else "UNKNOWN"
        conf_str = f"{face['similarity_score'] * 100:.1f}%"
        detector_str = f"{face['detection_source']} ({face['confidence']*100:.0f}%)"
        tilt_str = f"{face['rotation_angle']:.1f} deg"
        print(f"{i:<3} {face['predicted_name']:<15} {status:<12} {conf_str:<12} {detector_str:<15} {tilt_str}")
        
        if face["top_candidates"]:
            cand_str = ", ".join([f"{c['name']} ({c['similarity']*100:.1f}%)" for c in face["top_candidates"]])
            print(f"    Top Matches: {cand_str}")

    print("-" * 75)

    if args.output:
        out_path = Path(args.output)
        annotated = pipeline.annotate_image(img, results)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(out_path), annotated)
        print(f"Annotated viewfinder image saved to: {out_path}")

def handle_list(args):
    db = GalleryDatabase()
    profiles = db.list_profiles()
    print(f"\nEnrolled Gallery Profiles ({len(profiles)} total):")
    print("-" * 65)
    print(f"{'Name':<20} {'Shots':<8} {'Enrolled At'}")
    print("-" * 65)
    for p in profiles:
        print(f"{p['name']:<20} {p['num_shots']:<8} {p['created_at']}")
    print("-" * 65)

def handle_delete(args):
    db = GalleryDatabase()
    if db.delete_person(args.name):
        print(f"Successfully deleted '{args.name}' from gallery.")
    else:
        print(f"Subject '{args.name}' not found in gallery.")

def handle_evaluate(args):
    evaluator = BiometricEvaluator()
    print("Running automated biometric evaluation...")
    summary = evaluator.evaluate(test_dir=args.test_dir)
    print("\n" + "=" * 55)
    print("           BIOMETRIC EVALUATION SUMMARY")
    print("=" * 55)
    print(f"Total Test Queries:      {summary['total_test_samples']}")
    print(f"Enrolled Gallery Size:   {summary['enrolled_gallery_size']}")
    print(f"Optimal Threshold (EER): tau = {summary['optimal_threshold_eer']:.3f}")
    print(f"Equal Error Rate (EER):  {summary['equal_error_rate'] * 100:.2f}%")
    print(f"ROC-AUC Score:           {summary['roc_auc']:.4f}")
    
    d = summary["default_metrics_at_0_65"]
    print("-" * 55)
    print(f"Performance at Default Threshold (tau = 0.65):")
    print(f"  Accuracy:  {d['accuracy'] * 100:.2f}%")
    print(f"  Precision: {d['precision'] * 100:.2f}%")
    print(f"  Recall:    {d['recall'] * 100:.2f}%")
    print(f"  F1-Score:  {d['f1_score'] * 100:.2f}%")
    print(f"  FAR:       {d['far'] * 100:.2f}% (False Acceptance)")
    print(f"  FRR:       {d['frr'] * 100:.2f}% (False Rejection)")
    print("=" * 55)
    print(f"Visual plots saved to: {config.OUTPUTS_DIR.resolve()}")

def main():
    parser = argparse.ArgumentParser(
        description="Nimbus Face Recognition - Enterprise Biometric System CLI"
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Enroll
    enroll_parser = subparsers.add_parser("enroll", help="Enroll a new person with multi-shot images")
    enroll_parser.add_argument("--name", required=True, help="Person name / identity")
    enroll_parser.add_argument("--images", nargs="+", required=True, help="Image file paths or directory")

    # Identify
    id_parser = subparsers.add_parser("identify", help="Identify faces in an input image")
    id_parser.add_argument("--image", required=True, help="Input image path")
    id_parser.add_argument("--threshold", type=float, default=config.DEFAULT_REJECTION_THRESHOLD, help="Cosine similarity threshold (default: 0.65)")
    id_parser.add_argument("--output", help="Optional path to save viewfinder annotated image")

    # List
    subparsers.add_parser("list-gallery", help="List all enrolled gallery profiles")

    # Delete
    del_parser = subparsers.add_parser("delete-person", help="Delete a person from the gallery")
    del_parser.add_argument("--name", required=True, help="Person name to remove")

    # Evaluate
    eval_parser = subparsers.add_parser("evaluate", help="Run automated biometric evaluation suite")
    eval_parser.add_argument("--test-dir", help="Path to test dataset directory")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(0)

    if args.command == "enroll":
        handle_enroll(args)
    elif args.command == "identify":
        handle_identify(args)
    elif args.command == "list-gallery":
        handle_list(args)
    elif args.command == "delete-person":
        handle_delete(args)
    elif args.command == "evaluate":
        handle_evaluate(args)

if __name__ == "__main__":
    main()
