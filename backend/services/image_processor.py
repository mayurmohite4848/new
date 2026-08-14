import os
import uuid
import re
from datetime import datetime, timezone
from PIL import Image, ExifTags
from werkzeug.utils import secure_filename

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff'}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

def allowed_file(filename):
    """Checks if the uploaded file has a valid allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def format_file_size(size_in_bytes):
    """Formats bytes into human readable format (KB, MB, etc.)."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_in_bytes < 1024.0:
            return f"{size_in_bytes:.1f} {unit}"
        size_in_bytes /= 1024.0
    return f"{size_in_bytes:.1f} TB"

def process_and_save_image(file_obj, upload_folder):
    """
    Saves uploaded image file to the upload folder with a unique name,
    reads its technical metadata using Pillow, and extracts notes/text.
    """
    if not file_obj or file_obj.filename == '':
        raise ValueError("No file provided.")

    if not allowed_file(file_obj.filename):
        raise ValueError(f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    os.makedirs(upload_folder, exist_ok=True)

    original_name = secure_filename(file_obj.filename)
    extension = original_name.rsplit('.', 1)[1].lower() if '.' in original_name else 'jpg'
    unique_filename = f"{uuid.uuid4().hex[:12]}_{int(datetime.now(timezone.utc).timestamp())}.{extension}"
    save_path = os.path.join(upload_folder, unique_filename)

    file_obj.save(save_path)
    file_size_bytes = os.path.getsize(save_path)

    metadata = extract_image_metadata(save_path, original_name, file_size_bytes)
    extracted_data = extract_text_and_notes(save_path, original_name, metadata)

    return {
        "filename": unique_filename,
        "original_name": original_name,
        "file_path": save_path,
        "metadata": metadata,
        "extracted_text": extracted_data["extracted_text"],
        "suggested_title": extracted_data["suggested_title"],
        "suggested_tags": extracted_data["suggested_tags"],
        "suggested_content": extracted_data["suggested_content"]
    }

def extract_image_metadata(image_path, original_filename, file_size_bytes):
    """Extracts technical metadata and EXIF data using Pillow."""
    metadata = {
        "original_filename": original_filename,
        "file_size_bytes": file_size_bytes,
        "file_size_human": format_file_size(file_size_bytes),
        "width": 0,
        "height": 0,
        "aspect_ratio": "Unknown",
        "format": "Unknown",
        "mode": "Unknown",
        "has_transparency": False,
        "exif": {}
    }

    try:
        with Image.open(image_path) as img:
            metadata["width"] = img.width
            metadata["height"] = img.height
            metadata["format"] = img.format or (original_filename.rsplit('.', 1)[1].upper() if '.' in original_filename else 'IMG')
            metadata["mode"] = img.mode
            metadata["has_transparency"] = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)

            # Calculate Aspect Ratio
            if img.height > 0:
                ratio = img.width / img.height
                if abs(ratio - (16/9)) < 0.05:
                    metadata["aspect_ratio"] = "16:9"
                elif abs(ratio - (4/3)) < 0.05:
                    metadata["aspect_ratio"] = "4:3"
                elif abs(ratio - 1.0) < 0.05:
                    metadata["aspect_ratio"] = "1:1"
                elif abs(ratio - (9/16)) < 0.05:
                    metadata["aspect_ratio"] = "9:16 (Portrait)"
                elif abs(ratio - (3/4)) < 0.05:
                    metadata["aspect_ratio"] = "3:4 (Portrait)"
                else:
                    metadata["aspect_ratio"] = f"{ratio:.2f}:1"

            # Parse EXIF if present
            raw_exif = img.getexif()
            if raw_exif:
                exif_dict = {}
                for tag_id, value in raw_exif.items():
                    tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                    if isinstance(value, (str, int, float)):
                        exif_dict[tag_name] = str(value)
                metadata["exif"] = exif_dict

    except Exception as e:
        metadata["error"] = f"Metadata extraction warning: {str(e)}"

    return metadata

def extract_text_and_notes(image_path, original_filename, metadata):
    """
    Extracts text and structures note content from the image.
    Supports OCR integration and smart content formatting.
    """
    extracted_text = ""
    
    # Try pytesseract if available on system
    try:
        import pytesseract
        with Image.open(image_path) as img:
            extracted_text = pytesseract.image_to_string(img).strip()
    except Exception:
        # Tesseract not installed or failed; fallback to metadata and text analysis
        extracted_text = ""

    # Clean base filename without extension
    clean_name = os.path.splitext(original_filename)[0].replace('_', ' ').replace('-', ' ').strip()
    # Capitalize title words
    suggested_title = clean_name.title() if clean_name else "Extracted Note"

    # Derive tags based on filename, image attributes, and extracted text
    tags = ["image-note"]
    fmt = metadata.get("format", "").lower()
    if fmt:
        tags.append(fmt)

    width = metadata.get("width", 0)
    height = metadata.get("height", 0)
    if width > 1920 or height > 1080:
        tags.append("high-res")
    if metadata.get("has_transparency"):
        tags.append("transparent")

    lower_name = original_filename.lower()
    if any(k in lower_name for k in ["receipt", "bill", "invoice"]):
        tags.append("receipt")
    elif any(k in lower_name for k in ["diagram", "chart", "graph", "architecture"]):
        tags.append("diagram")
    elif any(k in lower_name for k in ["screen", "shot", "capture"]):
        tags.append("screenshot")
    elif any(k in lower_name for k in ["doc", "page", "scan", "paper", "book"]):
        tags.append("document")
    elif any(k in lower_name for k in ["whiteboard", "meeting", "brainstorm"]):
        tags.append("brainstorm")

    # Suggested content
    if extracted_text:
        content_preview = extracted_text
    else:
        content_preview = (
            f"Image Note imported from **{original_filename}**.\n\n"
            f"- **Resolution**: {width} × {height} px ({metadata.get('aspect_ratio', 'N/A')})\n"
            f"- **Format**: {metadata.get('format', 'N/A')} ({metadata.get('mode', 'N/A')})\n"
            f"- **File Size**: {metadata.get('file_size_human', 'N/A')}\n\n"
            f"Add your observations, key takeaways, and summary notes here."
        )

    return {
        "extracted_text": extracted_text,
        "suggested_title": suggested_title,
        "suggested_tags": list(set(tags)),
        "suggested_content": content_preview
    }
