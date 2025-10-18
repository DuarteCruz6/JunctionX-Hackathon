from datetime import datetime
from PIL.ExifTags import TAGS
import io
import re
import logging
from PIL import Image

logger = logging.getLogger(__name__)

def extract_image_date(file_content: bytes, filename: str) -> datetime:
    """
    Extract the best possible datetime from an image.
    Priority: EXIF -> filename -> current datetime.
    """
    exif_date = None

    try:
        with Image.open(io.BytesIO(file_content)) as img:
            exif_data = img.getexif()

        if not exif_data:
            logger.info(f"No EXIF data found for {filename}")
        else:
            # Map EXIF numeric tags to names
            exif = {TAGS.get(k, str(k)): v for k, v in exif_data.items()}
            logger.info(f"Available EXIF tags for {filename}: {list(exif.keys())}")

            # Search for any key containing 'Date' or 'Time'
            for k, v in exif.items():
                if isinstance(v, (bytes, str)) and re.search(r"date|time", str(k), re.IGNORECASE):
                    logger.info(f"Candidate tag: {k} = {v}")

            # Check typical date tags
            for tag in ["DateTimeOriginal", "DateTimeDigitized", "DateTime"]:
                if tag in exif:
                    exif_date = exif[tag]
                    logger.info(f"Found EXIF date in {tag}: {exif_date}")
                    break

            # Handle nested EXIF structure (for some formats)
            if not exif_date and hasattr(exif_data, "get_ifd"):
                for ifd_name in ("Exif", "GPSInfo", "1st"):
                    try:
                        sub_ifd = exif_data.get_ifd(ifd_name)
                        for k, v in sub_ifd.items():
                            name = TAGS.get(k, str(k))
                            if "Date" in name or "Time" in name:
                                exif_date = v
                                logger.info(f"Found nested date in {ifd_name}/{name}: {v}")
                                break
                    except Exception:
                        continue

        # Convert EXIF string to datetime
        if exif_date:
            if isinstance(exif_date, bytes):
                exif_date = exif_date.decode(errors="ignore").strip()
            exif_date = exif_date.strip()
            exif_date = exif_date.replace(":", "-", 2)
            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
                try:
                    dt = datetime.strptime(exif_date, fmt)
                    return dt
                except ValueError:
                    continue
            logger.warning(f"Unrecognized EXIF date format: {exif_date}")

    except Exception as e:
        logger.warning(f"Failed to read EXIF for {filename}: {e}")

    # --- Try to extract from filename ---
    filename_lower = filename.lower()
    date_patterns = [
        r"(\d{4})[-_]?(\d{1,2})[-_]?(\d{1,2})",  # YYYY-MM-DD, YYYYMMDD
        r"(\d{1,2})[-_]?(\d{1,2})[-_]?(\d{4})",  # DD-MM-YYYY
    ]
    for pattern in date_patterns:
        if match := re.search(pattern, filename_lower):
            try:
                groups = match.groups()
                if len(groups[0]) == 4:  # YYYY-MM-DD
                    y, m, d = map(int, groups)
                else:  # DD-MM-YYYY
                    d, m, y = map(int, groups)
                dt = datetime(y, m, d)
                logger.info(f"Extracted date from filename: {dt}")
                return dt
            except ValueError:
                continue

    # --- Fallback: current time ---
    fallback = datetime.now()
    logger.warning(f"No valid date found for {filename}, using current timestamp: {fallback}")
    return fallback
