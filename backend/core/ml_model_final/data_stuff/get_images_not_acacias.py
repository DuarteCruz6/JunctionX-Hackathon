import geopandas as gpd
import matplotlib.pyplot as plt
import contextily as cx
from shapely.geometry import box
import math
import os
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

# --- User-defined variables (change these) ---

# --- Filtering Conditions ---
# 1. Select all areas where 'COS18n1_C' is '5'
INCLUDE_COLUMN = 'COS18n1_C'
INCLUDE_VALUE = '5'

# 2. From that selection, EXCLUDE areas where 'COS18n4' is '5.1.1.6'
EXCLUDE_COLUMN = 'COS18n4_C'
EXCLUDE_VALUE = '5.1.1.6'

# --- File and Path Settings ---
SCRIPT_DIR = Path(__file__).parent
SHAPEFILE_PATH = SCRIPT_DIR / "shapes/COS2018v2-S1-shp/COS2018v2-S1.shp"

OUTPUT_DIR = SCRIPT_DIR / "data/train/images_not_acacias"

# This prefix will be used for the output filenames
FILENAME_PREFIX = f'{INCLUDE_COLUMN}_{INCLUDE_VALUE}_excluding_{EXCLUDE_COLUMN}_{EXCLUDE_VALUE}'

# --- Image and Performance Settings ---
OFFSET_FACTOR = 0.1
MAX_FRAME_SIZE_DEGREES = 0.5
DPI = 200
MAX_WORKERS = os.cpu_count() or 4 # Use all CPU cores, or fallback to 4

# --- Function to process a single frame (for parallel execution) ---
def process_frame(frame_data):
    feature_id, i_frame, f_minx, f_miny, f_maxx, f_maxy, crs_str, filename_prefix_str = frame_data

    fig, ax = plt.subplots(figsize=(10, 10))

    ax.set_xlim(f_minx, f_maxx)
    ax.set_ylim(f_miny, f_maxy)
    ax.set_aspect('equal', adjustable='box')

    try:
        cx.add_basemap(ax, crs=crs_str, source=cx.providers.Esri.WorldImagery, zoom='auto', attribution=False)
    except Exception as e:
        return f"ERROR: Basemap failed for feature {feature_id} frame {i_frame+1}: {e}"

    ax.set_xticks([])
    ax.set_yticks([])

    filename = os.path.join(OUTPUT_DIR, f'{filename_prefix_str}_{feature_id}_frame_{i_frame+1}.png')
    
    plt.savefig(filename, dpi=DPI, bbox_inches='tight', pad_inches=0)
    plt.close(fig)
    return f"Saved: {filename}"


# --- Main script execution block ---
if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"Loading shapefile from: {SHAPEFILE_PATH}")
    world = gpd.read_file(SHAPEFILE_PATH)

    if world.crs is None:
        print("Warning: Shapefile has no CRS. Assuming WGS84 (EPSG:4326).")
        world.set_crs('EPSG:4326', inplace=True)
    if world.crs.to_string() != 'EPSG:3857':
        print("Reprojecting GeoDataFrame to EPSG:3857.")
        world = world.to_crs(epsg=3857)

    # --- NEW FILTERING LOGIC ---
    print(f"Filtering for areas where '{INCLUDE_COLUMN}' is '{INCLUDE_VALUE}' AND '{EXCLUDE_COLUMN}' is NOT '{EXCLUDE_VALUE}'...")
    
    condition1 = (world[INCLUDE_COLUMN] == INCLUDE_VALUE)
    condition2 = (world[EXCLUDE_COLUMN] != EXCLUDE_VALUE)
    
    # Combine the conditions with a logical AND (&)
    target_areas = world[condition1 & condition2]

    if target_areas.empty:
        print("Warning: No areas found matching the specified criteria.")
    else:
        print(f"Found {len(target_areas)} matching areas.")
        all_frames_data = []

        for index, row in target_areas.iterrows():
            geometry = row.geometry
            feature_id = row.name

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

            for i_frame, (f_minx, f_miny, f_maxx, f_maxy) in enumerate(frames_for_feature):
                all_frames_data.append((feature_id, i_frame, f_minx, f_miny, f_maxx, f_maxy, world.crs.to_string(), FILENAME_PREFIX))
        
        print(f"Collected {len(all_frames_data)} frames for processing using up to {MAX_WORKERS} workers.")
        
        image_count = 0
        with ProcessPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_frame = {executor.submit(process_frame, frame_data): frame_data for frame_data in all_frames_data}
            
            for future in as_completed(future_to_frame):
                try:
                    result = future.result()
                    print(result)
                    if result.startswith("Saved"):
                        image_count += 1
                except Exception as exc:
                    print(f'A task generated an exception: {exc}')

        print(f"\nFinished processing. Generated {image_count} images in '{OUTPUT_DIR}' directory.")