import geopandas as gpd
from shapely.geometry import box
import math
from pathlib import Path
import os
import numpy as np
from PIL import Image
from rasterio import features
from rasterio.transform import from_bounds

# --- User-defined variables ---
SCRIPT_DIR = Path(__file__).parent
SHAPEFILE_PATH = SCRIPT_DIR / "shapes/COS2018v2-S1-shp/COS2018v2-S1.shp"
ATTRIBUTE_COLUMN = 'COS18n4_C'
TARGET_VALUE = '5.1.1.6'  # "Acacia"
OUTPUT_DIR = SCRIPT_DIR / "data/train/masks_acacias"
OFFSET_FACTOR = 0.1
MAX_FRAME_SIZE_DEGREES = 0.5
IMAGE_SIZE = 640  # px

# --- Ensure output directory exists ---
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- Load shapefile ---
print(f"Loading shapefile from: {SHAPEFILE_PATH}")
world = gpd.read_file(SHAPEFILE_PATH)

# Reproject to EPSG:3857 for meter-based calculations
if world.crs is None:
    print("Warning: Shapefile has no CRS. Assuming WGS84 (EPSG:4326).")
    world.set_crs('EPSG:4326', inplace=True)
if world.crs.to_string() != 'EPSG:3857':
    print("Reprojecting GeoDataFrame to EPSG:3857.")
    world = world.to_crs(epsg=3857)

# Filter target polygons
target_areas = world[world[ATTRIBUTE_COLUMN] == TARGET_VALUE]

if target_areas.empty:
    print("Warning: No 'Acacia' areas found with the specified attribute value.")
else:
    print(f"Found {len(target_areas)} matching 'Acacia' areas. Preparing to generate masks...")
    image_count = 0

    for index, row in target_areas.iterrows():
        geometry = row.geometry
        feature_id = row.name

        # Bounding box
        minx, miny, maxx, maxy = geometry.bounds
        min_extent_meters = 200
        width, height = maxx - minx, maxy - miny

        if width < min_extent_meters or height < min_extent_meters:
            center_x, center_y = (minx + maxx) / 2, (miny + maxy) / 2
            new_side = max(width, height, min_extent_meters)
            minx, maxx = center_x - new_side / 2, center_x + new_side / 2
            miny, maxy = center_y - new_side / 2, center_y + new_side / 2

        x_diff = (maxx - minx) * OFFSET_FACTOR
        y_diff = (maxy - miny) * OFFSET_FACTOR
        plot_minx_initial, plot_miny_initial = minx - x_diff, miny - y_diff
        plot_maxx_initial, plot_maxy_initial = maxx + x_diff, maxy + y_diff

        side_length = max(plot_maxx_initial - plot_minx_initial, plot_maxy_initial - plot_miny_initial)
        center_x, center_y = (plot_minx_initial + plot_maxx_initial) / 2, (plot_miny_initial + plot_maxy_initial) / 2

        plot_minx, plot_maxx = center_x - side_length / 2, center_x + side_length / 2
        plot_miny, plot_maxy = center_y - side_length / 2, center_y + side_length / 2

        current_frame_width = plot_maxx - plot_minx
        max_frame_size_meters = MAX_FRAME_SIZE_DEGREES * 111320

        frames_for_feature = []
        if current_frame_width > max_frame_size_meters:
            n_splits = math.ceil(current_frame_width / max_frame_size_meters)
            step = current_frame_width / n_splits
            overlap = step * 0.1
            for i_split in range(n_splits):
                for j_split in range(n_splits):
                    frame_minx = plot_minx + i_split * step - (overlap if i_split > 0 else 0)
                    frame_maxx = plot_minx + (i_split + 1) * step + (overlap if i_split < n_splits - 1 else 0)
                    frame_miny = plot_miny + j_split * step - (overlap if j_split > 0 else 0)
                    frame_maxy = plot_miny + (j_split + 1) * step + (overlap if j_split < n_splits - 1 else 0)
                    frames_for_feature.append((frame_minx, frame_miny, frame_maxx, frame_maxy))
        else:
            frames_for_feature.append((plot_minx, plot_miny, plot_maxx, plot_maxy))

        # --- Generate mask for each frame ---
        for i_frame, (f_minx, f_miny, f_maxx, f_maxy) in enumerate(frames_for_feature):
            # Filter polygons intersecting frame
            visible_acacia = target_areas[target_areas.geometry.intersects(box(f_minx, f_miny, f_maxx, f_maxy))]

            # Create empty mask
            mask = np.zeros((IMAGE_SIZE, IMAGE_SIZE), dtype=np.uint8)

            # Affine transform com from_bounds
            transform = from_bounds(f_minx, f_miny, f_maxx, f_maxy, IMAGE_SIZE, IMAGE_SIZE)

            # Rasterize polygons
            if not visible_acacia.empty:
                shapes = ((geom, 1) for geom in visible_acacia.geometry)
                mask = features.rasterize(shapes=shapes, out_shape=(IMAGE_SIZE, IMAGE_SIZE),
                                          transform=transform, fill=0, dtype=np.uint8)

            # Salva mask
            filename = os.path.join(OUTPUT_DIR, f'{ATTRIBUTE_COLUMN}_{TARGET_VALUE}_{feature_id}_frame_{i_frame+1}.png')
            Image.fromarray(mask).save(filename)

            image_count += 1
            if image_count % 100 == 0:
                print(f"Generated {image_count} masks so far...")

    print(f"\nFinished processing. Generated {image_count} mask images in '{OUTPUT_DIR}' directory.")
