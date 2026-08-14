import os
import re

_EASYOCR_READER = None

def get_ocr_reader():
    """Lazy loader for the PyTorch-based EasyOCR reader."""
    global _EASYOCR_READER
    if _EASYOCR_READER is None:
        try:
            import easyocr
            # Initialize with English, CPU mode for zero-cost / universal compatibility
            _EASYOCR_READER = easyocr.Reader(['en'], gpu=False, verbose=False)
        except Exception as e:
            print(f"Warning: Could not initialize PyTorch EasyOCR: {e}")
            _EASYOCR_READER = False
    return _EASYOCR_READER if _EASYOCR_READER is not False else None

def extract_handwriting_text(image_path):
    """
    Uses PyTorch-based EasyOCR to transcribe handwritten & printed text from image.
    Falls back to pytesseract if EasyOCR is not ready.
    """
    reader = get_ocr_reader()
    if reader:
        try:
            results = reader.readtext(image_path, detail=0, paragraph=True)
            if results:
                return "\n\n".join([r.strip() for r in results if r.strip()])
        except Exception as e:
            print(f"EasyOCR extraction error: {e}")

    # Fallback to pytesseract if installed
    try:
        import pytesseract
        from PIL import Image
        with Image.open(image_path) as img:
            return pytesseract.image_to_string(img).strip()
    except Exception:
        return ""

def segment_text_into_notes(extracted_text, original_filename="", metadata=None):
    """
    Analyzes extracted text and segments it into multiple distinct, structured notes.
    Detects headers, numbered lists, bullet clusters, and thematic topic shifts.
    """
    text = (extracted_text or "").strip()
    clean_base = os.path.splitext(original_filename)[0].replace('_', ' ').replace('-', ' ').title() if original_filename else "Extracted Note"

    # If no text extracted, return a single placeholder note draft
    if not text:
        return [{
            "title": clean_base,
            "content": f"Handwritten notes digitized from {original_filename or 'image'}.\n\nCleaned onto pure white canvas. Add your annotations here.",
            "extracted_text": "",
            "tags": ["white-canvas", "handwritten"],
            "handwriting_style": "font-caveat",
            "segment_index": 0
        }]

    # Try splitting by markdown headers (#, ##), capitalized titles, or double newlines
    # Pattern to match headers or numbered section blocks (e.g., "1. Title", "Step 1:", "Heading:")
    raw_blocks = re.split(r'\n\s*\n+', text)
    
    # Also check if text has explicit section markers
    section_patterns = re.findall(r'(?:^|\n)(?:#+\s*|[0-9]+[\.\)]\s*|[A-Z][A-Za-z\s]{2,30}:)', text)

    notes = []

    if len(raw_blocks) > 1 and (len(section_patterns) >= 2 or len(raw_blocks) >= 2):
        # Multi-note segmentation
        for idx, block in enumerate(raw_blocks):
            block_clean = block.strip()
            if not block_clean or len(block_clean) < 5:
                continue

            lines = [l.strip() for l in block_clean.split('\n') if l.strip()]
            first_line = lines[0] if lines else f"Topic {idx + 1}"

            # Derive title from first line
            candidate_title = re.sub(r'^[#0-9\.\-\*\:\s]+', '', first_line).strip()
            if len(candidate_title) > 45:
                candidate_title = candidate_title[:42] + "..."
            if not candidate_title:
                candidate_title = f"{clean_base} - Part {idx + 1}"

            # Derive content
            content_body = "\n".join(lines[1:]) if len(lines) > 1 else lines[0]

            # Choose handwriting font & tags based on content
            tags = ["handwritten", "white-canvas"]
            lower_b = block_clean.lower()
            style = "font-caveat"

            if any(k in lower_b for k in ["action", "todo", "task", "assign"]):
                tags.append("action-items")
                style = "font-kalam"
            elif any(k in lower_b for k in ["architecture", "diagram", "system", "design", "flow"]):
                tags.append("architecture")
                style = "font-architect"
            elif any(k in lower_b for k in ["summary", "key", "takeaway", "conclusion"]):
                tags.append("summary")
                style = "font-caveat"

            notes.append({
                "title": candidate_title.title(),
                "content": content_body or block_clean,
                "extracted_text": block_clean,
                "tags": list(set(tags)),
                "handwriting_style": style,
                "segment_index": idx
            })

    # If could not split or single block, create 1 comprehensive note
    if not notes:
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        first_line = lines[0] if lines else clean_base
        first_title = re.sub(r'^[#0-9\.\-\*\:\s]+', '', first_line).strip()
        if len(first_title) > 40:
            first_title = first_title[:38] + "..."

        notes.append({
            "title": first_title.title() if first_title else clean_base,
            "content": text,
            "extracted_text": text,
            "tags": ["handwritten", "white-canvas"],
            "handwriting_style": "font-caveat",
            "segment_index": 0
        })

    return notes
