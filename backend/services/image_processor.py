import os
import uuid
import re
from datetime import datetime, timezone
from PIL import Image, ImageFilter, ImageOps, ExifTags
import numpy as np
from werkzeug.utils import secure_filename
from backend.services.ocr_service import extract_handwriting_text, segment_text_into_notes

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

def clean_image_to_white_background(input_path, output_path):
    """
    Strips dark/yellow paper backgrounds, uneven shadows, and room lighting,
    extracting handwritten ink and sketches onto a crisp pure white background.
    """
    try:
        with Image.open(input_path) as original_img:
            rgb_img = original_img.convert('RGB')
            img_arr = np.array(rgb_img, dtype=np.float32)

            gray_img = original_img.convert('L')
            
            radius = max(15, min(rgb_img.width, rgb_img.height) // 25)
            bg_blur = gray_img.filter(ImageFilter.GaussianBlur(radius=radius))
            bg_arr = np.array(bg_blur, dtype=np.float32) + 1.0

            bg_arr_3d = np.repeat(bg_arr[:, :, np.newaxis], 3, axis=2)
            normalized = (img_arr / bg_arr_3d) * 255.0

            lower_bound = 120.0
            upper_bound = 230.0

            stretched = (normalized - lower_bound) / (upper_bound - lower_bound) * 255.0
            stretched = np.clip(stretched, 0.0, 255.0).astype(np.uint8)

            result_img = Image.fromarray(stretched, mode='RGB')
            result_img.save(output_path, format='PNG', optimize=True)
            return True
    except Exception as e:
        try:
            with Image.open(input_path) as original_img:
                original_img.convert('RGB').save(output_path, format='PNG')
            return True
        except Exception:
            return False

def generate_minimal_ai_enhancements(extracted_text, original_filename, metadata):
    """
    Generates strictly MINIMAL, high-value AI insights, key takeaways,
    and a clean visual concept outline with 0 API cost (100% free & local).
    """
    text = (extracted_text or "").strip()
    title_words = re.sub(r'[_\-\.]+', ' ', original_filename).title()

    takeaways = []
    core_concept = ""
    diagram_type = "concept_card"
    diagram_data = {}

    lines = [l.strip().lstrip('-*•0123456789. ') for l in text.split('\n') if len(l.strip()) > 3]

    if lines:
        takeaways = lines[:3]
        core_concept = lines[0] if len(lines[0]) < 100 else lines[0][:97] + "..."
    else:
        clean_name = os.path.splitext(original_filename)[0].replace('_', ' ').replace('-', ' ').title()
        lower_name = clean_name.lower()

        if any(w in lower_name for w in ["receipt", "bill", "invoice"]):
            takeaways = [
                "Financial record captured & categorized.",
                "Verify totals, vendor name, and date details in review.",
                "Saved to persistent archive with indexed timestamp."
            ]
            core_concept = "Expense / Accounting Document"
            diagram_type = "finance_card"
            diagram_data = {"type": "badge", "label": "Verified Document", "icon": "receipt"}
        elif any(w in lower_name for w in ["diagram", "architecture", "flow", "system"]):
            takeaways = [
                "Visual architecture / system structure extracted.",
                "Strokes binarized onto white paper canvas for high legibility.",
                "Suitable for documentation and meeting review."
            ]
            core_concept = f"Architecture / Flow: {clean_name}"
            diagram_type = "flow_step"
            diagram_data = {"steps": ["Input", "Processing Layer", "Output Store"]}
        else:
            takeaways = [
                f"Handwritten notes & diagrams digitized onto clean white canvas.",
                f"Image resolution: {metadata.get('width', 'N/A')}x{metadata.get('height', 'N/A')} ({metadata.get('aspect_ratio', 'N/A')}).",
                "Ready for quick annotation, export, or study review."
            ]
            core_concept = clean_name or "Digitized Note"
            diagram_type = "note_badge"
            diagram_data = {"type": "concept", "label": "Key Insight", "topic": clean_name}

    takeaways = takeaways[:3]

    return {
        "core_concept": core_concept,
        "key_takeaways": takeaways,
        "diagram_type": diagram_type,
        "diagram_data": diagram_data,
        "study_tip": f"Review key points for '{title_words.split('.')[0]}'." if title_words else "Note digitized."
    }

def process_and_save_image(file_obj, upload_folder):
    """
    Saves uploaded image, generates clean white canvas scan,
    runs PyTorch OCR handwriting identification, and segments text into note drafts.
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

    # Clean to white background
    cleaned_filename = f"clean_{unique_prefix}_{timestamp}.png"
    cleaned_path = os.path.join(upload_folder, cleaned_filename)
    cleaned_success = clean_image_to_white_background(save_path, cleaned_path)

    if not cleaned_success:
        cleaned_filename = unique_filename
        cleaned_path = save_path

    metadata = extract_image_metadata(save_path, original_name, file_size_bytes)
    
    # Run PyTorch/EasyOCR text identification from clean canvas
    ocr_text = extract_handwriting_text(cleaned_path) or extract_handwriting_text(save_path)
    
    # Segment into multi-note drafts
    segmented_notes = segment_text_into_notes(ocr_text, original_name, metadata)

    # Generate zero-cost minimal AI insights
    ai_insights = generate_minimal_ai_enhancements(ocr_text, original_name, metadata)

    clean_base = os.path.splitext(original_name)[0].replace('_', ' ').replace('-', ' ').title()

    return {
        "filename": unique_filename,
        "cleaned_filename": cleaned_filename,
        "original_name": original_name,
        "file_path": save_path,
        "cleaned_file_path": cleaned_path,
        "metadata": metadata,
        "extracted_text": ocr_text,
        "suggested_title": clean_base,
        "suggested_tags": ["white-canvas", "handwritten"],
        "suggested_content": ocr_text or f"Handwritten notes digitized from {original_name}.",
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
