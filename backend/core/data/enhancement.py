#!/usr/bin/env python3
"""
YOLOv8 Satellite Imagery Preprocessing Pipeline (SEGMENTATION)
Flat directory version for YOLOv8-seg.

Expected input directory structure:
    fotos_invasoras/
        mapa_1.jpg
        mapa_1.txt
        mapa_2.jpg
        mapa_2.txt
        classes.txt

Workflow:
1. Apply CLAHE + Sharpening
2. Convert YOLO-Seg → COCO (filter invalid polygons)
3. Clean the COCO JSON (remove degenerate polygons)
4. Slice with SAHI (auto-skip bad polygons)
5. Convert back to YOLO-Seg (and move images)
6. Generate YOLO data.yaml + train.py
"""

import os
import cv2
import glob
import json
import shutil
import argparse
import numpy as np
from tqdm import tqdm
from shapely.geometry import Polygon
from sahi.slicing import slice_coco

# --- CONFIGURATION ---
DEFAULT_INPUT_DIR = "fotos_invasoras"
DEFAULT_OUTPUT_DIR = "processed_acacia_dataset"
TILE_SIZE = 640
OVERLAP_RATIO = 0.2
MIN_AREA_THRESHOLD = 1e-3  # Ignore polygons smaller than this
# ----------------------

def get_shapely_area(coords):
    """Return polygon area using shapely, or 0 if invalid."""
    try:
        if not coords or len(coords) < 6:
            return 0.0
        pts = [(coords[i], coords[i + 1]) for i in range(0, len(coords), 2)]
        poly = Polygon(pts)
        if not poly.is_valid:
            poly = poly.buffer(0)
        if not poly.is_valid:
            return 0.0
        return abs(poly.area)
    except Exception:
        return 0.0

def apply_clahe_and_sharpen(image):
    """Enhance image contrast and sharpness."""
    try:
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        blurred = cv2.GaussianBlur(cl, (0, 0), 3)
        sharp = cv2.addWeighted(cl, 1.5, blurred, -0.5, 0)
        merged = cv2.merge((sharp, a, b))
        return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)
    except cv2.error:
        return image

def convert_yolo_seg_to_coco(yolo_dir, class_names):
    """Convert YOLO-seg annotations to COCO JSON."""
    coco = {"images": [], "annotations": [], "categories": [{"id": i, "name": n} for i, n in enumerate(class_names)]}
    image_id, ann_id = 0, 0
    image_paths = sorted(glob.glob(os.path.join(yolo_dir, "mapa_*.jpg")) + glob.glob(os.path.join(yolo_dir, "mapa_*.png")))
    for img_path in tqdm(image_paths, desc="Converting YOLO → COCO"):
        image = cv2.imread(img_path)
        if image is None:
            continue
        h, w, _ = image.shape
        base = os.path.basename(img_path)
        coco["images"].append({"id": image_id, "file_name": base, "height": h, "width": w})
        txt_path = os.path.splitext(img_path)[0] + ".txt"
        if os.path.exists(txt_path):
            with open(txt_path) as f:
                for line in f:
                    parts = line.strip().split()
                    if not parts:
                        continue
                    cls = int(parts[0])
                    pts = [float(x) for x in parts[1:]]
                    seg = []
                    for i in range(0, len(pts), 2):
                        seg.extend([pts[i] * w, pts[i + 1] * h])
                    area = get_shapely_area(seg)
                    if area <= MIN_AREA_THRESHOLD:
                        continue
                    xs = seg[::2]
                    ys = seg[1::2]
                    x_min, y_min = min(xs), min(ys)
                    bbox_w, bbox_h = max(xs) - x_min, max(ys) - y_min
                    coco["annotations"].append({
                        "id": ann_id,
                        "image_id": image_id,
                        "category_id": cls,
                        "bbox": [x_min, y_min, bbox_w, bbox_h],
                        "segmentation": [seg],
                        "area": area,
                        "iscrowd": 0,
                    })
                    ann_id += 1
        image_id += 1
    return coco

def clean_coco_json(coco_data):
    """Remove degenerate, zero-area, or malformed polygons from COCO JSON."""
    clean_anns = []
    for ann in coco_data["annotations"]:
        segs = ann.get("segmentation", [])
        if not segs or not isinstance(segs, list) or not segs[0]:
            continue
        seg = segs[0]
        if len(seg) < 6:
            continue
        if any([not np.isfinite(v) for v in seg]):
            continue
        area = get_shapely_area(seg)
        if area <= MIN_AREA_THRESHOLD:
            continue
        seg = [float(max(v, 0)) for v in seg]
        ann["segmentation"] = [seg]
        ann["area"] = area
        clean_anns.append(ann)
    coco_data["annotations"] = clean_anns
    print(f"🧹 Cleaned COCO annotations: {len(clean_anns)} valid polygons remain.")
    return coco_data

# Clean COCO JSON to ensure no zero-area polygons before slicing
def ensure_positive_area(coco_json_path):
    with open(coco_json_path, "r") as f:
        coco = json.load(f)

    valid_anns = []
    removed = 0
    for ann in coco["annotations"]:
        segs = ann.get("segmentation", [])
        if not segs or not segs[0]:
            removed += 1
            continue
        area = get_shapely_area(segs[0])
        if area <= MIN_AREA_THRESHOLD:
            removed += 1
            continue
        ann["area"] = area
        valid_anns.append(ann)

    coco["annotations"] = valid_anns
    with open(coco_json_path, "w") as f:
        json.dump(coco, f)
    print(f"🧹 Removed {removed} zero-area or invalid polygons. Remaining: {len(valid_anns)}")

def sanitize_coco_annotations(coco_json_path, min_area=1e-6):
    """
    Remove any annotations with zero or invalid area, and ensure all areas are positive.
    """
    with open(coco_json_path, "r") as f:
        coco = json.load(f)

    valid_anns = []
    removed_count = 0

    for ann in coco.get("annotations", []):
        seg = ann.get("segmentation", [])
        if not seg or not isinstance(seg, list) or not seg[0]:
            removed_count += 1
            continue

        area = get_shapely_area(seg[0])
        if area <= min_area or not np.isfinite(area):
            removed_count += 1
            continue

        ann["area"] = area
        valid_anns.append(ann)

    coco["annotations"] = valid_anns
    with open(coco_json_path, "w") as f:
        json.dump(coco, f)
    print(f"🧹 Sanitized COCO annotations: removed {removed_count} invalid polygons, {len(valid_anns)} remain.")


def safe_slice_coco(coco_json_path, image_dir, output_dir):
    """
    Slice dataset with SAHI, automatically removing any annotations
    that could trigger ZeroDivisionError.
    """
    import numpy as np
    import json

    # Step 1: Load COCO JSON
    with open(coco_json_path, "r") as f:
        coco = json.load(f)

    # Step 2: Remove any annotations with zero/invalid area
    cleaned_annotations = []
    removed_count = 0
    for ann in coco.get("annotations", []):
        segs = ann.get("segmentation", [])
        if not segs or not segs[0]:
            removed_count += 1
            continue
        seg = segs[0]
        if len(seg) < 6:  # Need at least 3 points
            removed_count += 1
            continue
        area = get_shapely_area(seg)
        if not np.isfinite(area) or area <= MIN_AREA_THRESHOLD:
            removed_count += 1
            continue
        ann["area"] = area
        cleaned_annotations.append(ann)

    coco["annotations"] = cleaned_annotations
    with open(coco_json_path, "w") as f:
        json.dump(coco, f)
    print(f"🧹 Removed {removed_count} invalid or zero-area polygons. Remaining: {len(cleaned_annotations)}")

    # Step 3: Slice with SAHI
    from sahi.slicing import slice_coco

    slice_coco(
        coco_annotation_file_path=coco_json_path,
        image_dir=image_dir,
        output_dir=output_dir,
        output_coco_annotation_file_name="sliced.json",
        slice_height=TILE_SIZE,
        slice_width=TILE_SIZE,
        overlap_height_ratio=OVERLAP_RATIO,
        overlap_width_ratio=OVERLAP_RATIO,
        verbose=False,
    )



def convert_coco_seg_to_yolo(coco_json_path, output_dir):
    """Convert COCO-seg annotations back to YOLO-seg."""
    with open(coco_json_path) as f:
        coco = json.load(f)
    images = {img["id"]: img for img in coco["images"]}
    out_img_dir = os.path.join(output_dir, "images", "train")
    out_lbl_dir = os.path.join(output_dir, "labels", "train")
    os.makedirs(out_img_dir, exist_ok=True)
    os.makedirs(out_lbl_dir, exist_ok=True)
    grouped = {}
    for ann in coco["annotations"]:
        grouped.setdefault(ann["image_id"], []).append(ann)
    for img_id, anns in tqdm(grouped.items(), desc="Converting COCO → YOLO"):
        img_info = images[img_id]
        w, h = img_info["width"], img_info["height"]
        lbl_path = os.path.join(out_lbl_dir, os.path.splitext(img_info["file_name"])[0] + ".txt")
        lines = []
        for ann in anns:
            pts = ann["segmentation"][0]
            norm = []
            for i in range(0, len(pts), 2):
                norm.extend([pts[i] / w, pts[i + 1] / h])
            lines.append(f"{ann['category_id']} " + " ".join([f"{x:.6f}" for x in norm]))
        with open(lbl_path, "w") as f:
            f.write("\n".join(lines))
        src = os.path.join(output_dir, img_info["file_name"])
        if os.path.exists(src):
            shutil.move(src, out_img_dir)

def generate_yolo_config(output_dir, class_names):
    """Generate YOLOv8 data.yaml file."""
    yaml = f"path: {os.path.abspath(output_dir)}\ntrain: images/train\nval: images/valid\n\nnames:\n"
    for i, n in enumerate(class_names):
        yaml += f"  {i}: {n}\n"
    with open(os.path.join(output_dir, "data.yaml"), "w") as f:
        f.write(yaml)
    print("✅ Created data.yaml")

def generate_training_script(output_dir):
    """Generate example YOLOv8 training script."""
    script = """from ultralytics import YOLO
import os
model = YOLO('yolov8n-seg.pt')
data = os.path.join(os.path.dirname(__file__), 'data.yaml')
if __name__ == '__main__':
    model.train(
        data=data,
        epochs=100,
        imgsz=640,
        degrees=90,
        flipud=0.5,
        fliplr=0.5,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        blur=3.0,
        copy_paste=0.1,
        mosaic=0.0,
        batch=8,
        patience=20
    )
"""
    with open(os.path.join(output_dir, "train.py"), "w") as f:
        f.write(script)
    print("✅ Created train.py")

def main(input_dir, output_dir):
    print("--- Starting Dataset Preprocessing ---")
    cls_path = os.path.join(input_dir, "classes.txt")
    if not os.path.exists(cls_path):
        print("❌ classes.txt not found.")
        return
    with open(cls_path) as f:
        classes = [c.strip() for c in f if c.strip()]
    print(f"Found {len(classes)} classes: {classes}")
    imgs = sorted(glob.glob(os.path.join(input_dir, "mapa_*.jpg")) + glob.glob(os.path.join(input_dir, "mapa_*.png")))
    pairs = [i for i in imgs if os.path.exists(os.path.splitext(i)[0] + ".txt")]
    print(f"Found {len(pairs)} valid image/label pairs.")
    temp_dir = os.path.join(output_dir, "temp_processing")
    enh_dir = os.path.join(temp_dir, "enhanced")
    os.makedirs(enh_dir, exist_ok=True)
    print("Applying CLAHE + Sharpening...")
    for p in tqdm(pairs):
        img = cv2.imread(p)
        if img is None:
            continue
        cv2.imwrite(os.path.join(enh_dir, os.path.basename(p)), apply_clahe_and_sharpen(img))
    coco = convert_yolo_seg_to_coco(input_dir, classes)
    coco = clean_coco_json(coco)
    coco_json = os.path.join(temp_dir, "annotations.json")
    with open(coco_json, "w") as f:
        json.dump(coco, f)
    print(f"✅ COCO JSON saved: {coco_json}")
    print("Slicing dataset with SAHI...")
    ensure_positive_area(coco_json)
    safe_slice_coco(coco_json, enh_dir, output_dir)
    sliced_json = os.path.join(output_dir, "sliced.json_coco.json")
    convert_coco_seg_to_yolo(sliced_json, output_dir)
    print("✅ Slicing complete!")
    shutil.rmtree(temp_dir, ignore_errors=True)
    if os.path.exists(sliced_json):
        os.remove(sliced_json)
    generate_yolo_config(output_dir, classes)
    generate_training_script(output_dir)
    print(f"🎉 Done! Dataset ready at: {output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=str, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--output", type=str, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()
    if os.path.exists(args.output):
        shutil.rmtree(args.output)
    main(args.input, args.output)
