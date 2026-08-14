import os
import uuid
import re
from datetime import datetime, timezone
from PIL import Image, ExifTags
from werkzeug.utils import secure_filename
from backend.services.ocr_service import extract_handwriting_text, segment_text_into_notes

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff'}

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

def generate_minimal_ai_enhancements(extracted_text, original_filename, metadata):
    """
    Generates strictly MINIMAL, high-value AI key takeaways and core concepts with $0 cost.
    """
    text = (extracted_text or "").strip()
    title_words = re.sub(r'[_\-\.]+', ' ', original_filename).title()

    takeaways = []
    core_concept = ""

    lines = [l.strip().lstrip('-*•0123456789. ') for l in text.split('\n') if len(l.strip()) > 3]

    if lines:
        takeaways = lines[:3]
        core_concept = lines[0] if len(lines[0]) < 80 else lines[0][:77] + "..."
    else:
        clean_name = os.path.splitext(original_filename)[0].replace('_', ' ').replace('-', ' ').title()
        core_concept = clean_name or "Digitized Note"
        takeaways = [
            f"Plain text note extracted from {original_filename}.",
            f"Image dimensions: {metadata.get('width', 'N/A')}x{metadata.get('height', 'N/A')}."
        ]

    return {
        "core_concept": core_concept,
        "key_takeaways": takeaways[:3]
    }

def process_and_save_image(file_obj, upload_folder, api_key=None):
    """
    Saves uploaded image untouched (original photo), extracts plain text,
    and segments into clean plain-text note drafts.
    """
    if not file_obj or file_obj.filename == '':
        raise ValueError("No file provided.")

    if not allowed_file(file_obj.filename):
        raise ValueError(f"Unsupported file type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")

    os.makedirs(upload_folder, exist_ok=True)

    original_name = secure_filename(file_obj.filename)
    extension = original_name.rsplit('.', 1)[1].lower() if '.' in original_name else 'jpg'
    
    timestamp = int(datetime.now(timezone.utc).timestamp())
    unique_prefix = uuid.uuid4().hex[:12]
    unique_filename = f"{unique_prefix}_{timestamp}.{extension}"
    save_path = os.path.join(upload_folder, unique_filename)

    file_obj.save(save_path)
    file_size_bytes = os.path.getsize(save_path)

    metadata = extract_image_metadata(save_path, original_name, file_size_bytes)
    
    # Run text transcription (Gemini Flash Vision / local fallback)
    plain_text = extract_handwriting_text(save_path, api_key=api_key)
    
    # Segment into multi-note plain text drafts
    segmented_notes = segment_text_into_notes(plain_text, original_name, metadata)

    # Generate minimal AI insights
    ai_insights = generate_minimal_ai_enhancements(plain_text, original_name, metadata)

    clean_base = os.path.splitext(original_name)[0].replace('_', ' ').replace('-', ' ').title()

    return {
        "filename": unique_filename,
        "original_name": original_name,
        "file_path": save_path,
        "metadata": metadata,
        "extracted_text": plain_text,
        "suggested_title": clean_base,
        "suggested_tags": ["notes", "extracted"],
        "suggested_content": plain_text or f"Notes digitized from {original_name}.",
        "ai_insights": ai_insights,
        "segmented_notes": segmented_notes
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
        "format": "Unknown"
    }

    try:
        with Image.open(image_path) as img:
            metadata["width"] = img.width
            metadata["height"] = img.height
            metadata["format"] = img.format or 'IMG'

            if img.height > 0:
                ratio = img.width / img.height
                if abs(ratio - (16/9)) < 0.05:
                    metadata["aspect_ratio"] = "16:9"
                elif abs(ratio - (4/3)) < 0.05:
                    metadata["aspect_ratio"] = "4:3"
                elif abs(ratio - 1.0) < 0.05:
                    metadata["aspect_ratio"] = "1:1"
                else:
                    metadata["aspect_ratio"] = f"{ratio:.2f}:1"
    except Exception as e:
        metadata["error"] = f"Metadata extraction: {str(e)}"

    return metadata
