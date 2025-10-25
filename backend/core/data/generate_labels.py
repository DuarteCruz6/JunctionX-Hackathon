#!/usr/bin/env python3

"""
GeoJSON to YOLO-Seg Conversion Script

This script reads a GeoJSON file containing real-world polygons (like acacias)
and "burns" them onto georeferenced image files (e.g., PNG + PGW).

It generates the YOLOv8-seg-compatible .txt label files that the
`enhacement.py` script needs.
"""

import os
import glob
import argparse
import geopandas as gpd
import rasterio
from rasterio.crs import CRS
from shapely.geometry import box
from tqdm import tqdm

# --- CONFIGURATION ---
# IMPORTANT: Adjust these to match your GeoJSON properties
# This is the "key" in the "properties" section
FILTER_KEY = "COS18n4_L" 
# This is the "value" for the key that we want to label
FILTER_VALUE = "Florestas de espécies invasoras"
# This is the class ID that will be written to the .txt file (0 for "acacia")
CLASS_ID = 0
# --- END CONFIGURATION ---


def convert_world_to_pixel(transform, width, height, geometries):
    """
    Converts real-world polygon coordinates to normalized YOLO format.
    
    :param transform: The Affine transform from the rasterio image.
    :param width: Image width in pixels.
    :param height: Image height in pixels.
    :param geometries: A list of Shapely polygons to convert.
    :return: A list of YOLO-formatted strings.
    """
    yolo_lines = []
    
    for poly in geometries:
        # Handle both Polygon and MultiPolygon
        if poly.geom_type == 'MultiPolygon':
            all_polygons = poly.geoms
        elif poly.geom_type == 'Polygon':
            all_polygons = [poly]
        else:
            continue # Skip other types like Points or Lines
            
        for sub_poly in all_polygons:
            if sub_poly.is_empty:
                continue
                
            # Get the exterior coordinates of the polygon
            # We skip interior holes for simplicity, which is usually fine for YOLO
            world_coords = sub_poly.exterior.coords
            
            # Use rasterio's transform to convert world (x,y) to pixel (col, row)
            # `~transform` is the inverse (world-to-pixel)
            pixel_coords = [~transform * (x, y) for x, y in world_coords]
            
            # Normalize coordinates (0.0 to 1.0)
            # We also filter out any points that ended up outside the image bounds
            normalized_coords = []
            for px, py in pixel_coords:
                norm_x = px / width
                norm_y = py / height
                
                # Clamp values to be strictly within [0, 1]
                norm_x = max(0.0, min(1.0, norm_x))
                norm_y = max(0.0, min(1.0, norm_y))
                normalized_coords.append(f"{norm_x:.6f}")
                normalized_coords.append(f"{norm_y:.6f}")
            
            # A valid polygon needs at least 3 points
            if len(normalized_coords) >= 6:
                yolo_line = f"{CLASS_ID} {' '.join(normalized_coords)}"
                yolo_lines.append(yolo_line)
                
    return yolo_lines


def main(image_dir, geojson_file):
    """
    Main function to process all images and generate labels.
    """
    print("--- Starting GeoJSON to YOLO Label Generation ---")
    
    # --- 1. Load and Filter GeoJSON ---
    print(f"Loading GeoJSON from: {geojson_file}")
    try:
        gdf = gpd.read_file(geojson_file)
    except Exception as e:
        print(f"[Error] Could not read GeoJSON file: {e}")
        return

    print(f"Original GeoJSON CRS: {gdf.crs}")
    
    # Filter the GeoDataFrame to only get the polygons we care about
    print(f"Filtering for: '{FILTER_KEY}' == '{FILTER_VALUE}'")
    filtered_gdf = gdf[gdf[FILTER_KEY] == FILTER_VALUE]
    
    if filtered_gdf.empty:
        print(f"[Error] No features found with '{FILTER_KEY}' == '{FILTER_VALUE}'.")
        print("Please check your FILTER_KEY and FILTER_VALUE settings in the script.")
        return
        
    print(f"Found {len(filtered_gdf)} matching polygons to label.")

    # --- 2. Find Image Files ---
    image_paths = sorted(glob.glob(os.path.join(image_dir, "mapa_*.png")))
    if not image_paths:
        print(f"[Error] No 'mapa_*.png' images found in: {image_dir}")
        return
        
    print(f"Found {len(image_paths)} images to process.")
    
    # --- 3. Process Each Image ---
    count_generated = 0
    for img_path in tqdm(image_paths, desc="Processing Images"):
        
        try:
            with rasterio.open(img_path) as src:
                img_bounds = src.bounds
                img_width = src.width
                img_height = src.height
                img_transform = src.transform
                img_crs = src.crs
            
            # --- START OF FIX ---
            # If the image's CRS is missing, assume it matches the GeoJSON.
            # We know from your GeoJSON that the CRS is EPSG:3763
            if not img_crs:
                img_crs = CRS.from_epsg(3763)
            # --- END OF FIX ---
            
            # Create a Shapely box from the image's real-world boundaries
            img_bbox_poly = box(img_bounds.left, img_bounds.bottom, img_bounds.right, img_bounds.top)

            # --- 4. Reproject GeoJSON if CRS doesn't match ---
            if filtered_gdf.crs != img_crs:
                # This 'if' block will now be correctly skipped
                print(f"  [Notice] Reprojecting GeoJSON CRS from {filtered_gdf.crs} to {img_crs}...")
                filtered_gdf_reprojected = filtered_gdf.to_crs(img_crs)
            else:
                # This 'else' block will now be correctly executed
                filtered_gdf_reprojected = filtered_gdf

            # --- 5. Clip Polygons to Image Boundaries ---
            # This finds all acacia polygons that fall inside the current image
            clipped_gdf = filtered_gdf_reprojected.clip(img_bbox_poly)
            
            if clipped_gdf.empty:
                # No matching acacias in this image, skip
                continue

            # --- 6. Convert Coords and Write .txt File ---
            yolo_lines = convert_world_to_pixel(
                img_transform, img_width, img_height, clipped_gdf.geometry
            )
            
            if yolo_lines:
                # Create the .txt file path
                label_base = os.path.splitext(os.path.basename(img_path))[0]
                output_txt_path = os.path.join(image_dir, f"{label_base}.txt")
                
                with open(output_txt_path, 'w') as f:
                    f.write("\n".join(yolo_lines) + "\n")
                count_generated += 1

        except Exception as e:
            print(f"\n[Warning] Failed to process {img_path}: {e}")
            continue
            
    print("\n--- Label Generation Complete! ---")
    print(f"Successfully generated {count_generated} new .txt label files.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert GeoJSON Polygons to YOLO Segmentation Labels.")
    parser.add_argument(
        "--image-dir", 
        required=True,
        help="Path to the directory containing 'mapa_*.png' and 'mapa_*.pgw' files."
    )
    parser.add_argument(
        "--geojson-file", 
        required=True,
        help="Path to your GeoJSON file."
    )
    
    args = parser.parse_args()
    
    # We will write the .txt files *into* the image directory,
    # so the `enhacement.py` script can find them.
    main(args.image_dir, args.geojson_file)