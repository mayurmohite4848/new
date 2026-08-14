import os
import re
from PIL import Image, ImageEnhance, ImageFilter

_EASYOCR_READER = None

# Comprehensive dictionary for common handwritten, technical, and academic abbreviations
SHORTHAND_WORDS = {
    'w/': 'with',
    'w/o': 'without',
    'w/i': 'within',
    'b/c': 'because',
    'b/w': 'between',
    'e.g.': 'for example',
    'i.e.': 'that is',
    'approx': 'approximately',
    'approx.': 'approximately',
    'vs': 'versus',
    'vs.': 'versus',
    'dept': 'department',
    'dept.': 'department',
    'asap': 'as soon as possible',
    'tbd': 'to be determined',
    'tba': 'to be announced',
    'eta': 'estimated time of arrival',
    'mgmt': 'management',
    'mgt': 'management',
    'org': 'organization',
    'corp': 'corporation',
    'info': 'information',
    'temp': 'temporary',
    'avg': 'average',
    'diff': 'difference',
    'eval': 'evaluation',
    'calc': 'calculation',
    'intro': 'introduction',
    'reqs': 'requirements',
    'req': 'requirement',
    'impl': 'implementation',
    'config': 'configuration',
    'doc': 'document',
    'docs': 'documents',
    'spec': 'specification',
    'specs': 'specifications',
    'arch': 'architecture',
    'db': 'database',
    'auth': 'authentication',
    'sync': 'synchronization',
    'async': 'asynchronous',
    'dev': 'development',
    'devs': 'developers',
    'prod': 'production',
    'env': 'environment',
    'fn': 'function',
    'func': 'function',
    'msg': 'message',
    'pkg': 'package',
    'num': 'number',
    'no.': 'number',
    'ref': 'reference',
    'stmt': 'statement',
    'sec': 'section',
    'para': 'paragraph',
    'sys': 'system',
    'ui': 'UI',
    'ux': 'UX',
    'pr': 'PR',
    'api': 'API',
    'sql': 'SQL',
    'min': 'minimum',
    'max': 'maximum'
}

# Common OCR confusion words where characters were misread
COMMON_OCR_WORD_CORRECTIONS = {
    # "rn" -> "m"
    r'\brnake\b': 'make',
    r'\brnade\b': 'made',
    r'\bfrorn\b': 'from',
    r'\binforrnation\b': 'information',
    r'\bprograrn\b': 'program',
    r'\bsystern\b': 'system',
    r'\bexarnple\b': 'example',
    r'\brnodule\b': 'module',
    r'\brnodel\b': 'model',
    r'\bterrn\b': 'term',
    r'\bforrn\b': 'form',
    r'\bperforrn\b': 'perform',
    r'\brneet\b': 'meet',
    r'\brneeting\b': 'meeting',
    r'\brnethod\b': 'method',
    r'\btirn\b': 'time',
    r'\btirne\b': 'time',
    r'\bsurn\b': 'sum',
    r'\brnost\b': 'most',
    # "cl" -> "d"
    r'\bclata\b': 'data',
    r'\bclatabase\b': 'database',
    r'\bclraw\b': 'draw',
    r'\bclate\b': 'date',
    r'\bclrive\b': 'drive',
    r'\bclocument\b': 'document',
    r'\bcletail\b': 'detail',
    # "vv" -> "w"
    r'\bvvith\b': 'with',
    r'\bvvork\b': 'work',
    r'\bvvrite\b': 'write',
    r'\bvvhere\b': 'where',
    r'\bvvhich\b': 'which',
    r'\bvvhile\b': 'while'
}

def get_ocr_reader():
    """Lazy loader for the PyTorch-based EasyOCR reader."""
    global _EASYOCR_READER
    if _EASYOCR_READER is None:
        try:
            import easyocr
            _EASYOCR_READER = easyocr.Reader(['en'], gpu=False, verbose=False)
        except Exception as e:
            print(f"Warning: Could not initialize PyTorch EasyOCR: {e}")
            _EASYOCR_READER = False
    return _EASYOCR_READER if _EASYOCR_READER is not False else None

def preprocess_handwriting_image(image_path):
    """
    Applies multi-scale upsampling and contrast sharpening to clarify
    cursive loops, thin pencil/pen strokes, and messy ligatures for OCR.
    """
    try:
        with Image.open(image_path) as img:
            rgb_img = img.convert('RGB')

            # Upscale small images if width or height < 1200px
            if rgb_img.width < 1200 or rgb_img.height < 1200:
                scale_factor = min(2.0, 1600.0 / max(rgb_img.width, rgb_img.height))
                new_w = int(rgb_img.width * scale_factor)
                new_h = int(rgb_img.height * scale_factor)
                rgb_img = rgb_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

            # Enhance stroke sharpness
            enhancer = ImageEnhance.Sharpness(rgb_img)
            sharpened = enhancer.enhance(1.6)

            # Enhance contrast slightly to distinguish ink from paper
            contrast_enhancer = ImageEnhance.Contrast(sharpened)
            enhanced = contrast_enhancer.enhance(1.25)

            base_dir = os.path.dirname(image_path)
            preprocessed_path = os.path.join(base_dir, f"prep_{os.path.basename(image_path)}")
            enhanced.save(preprocessed_path, format='PNG')
            return preprocessed_path
    except Exception as e:
        print(f"Preprocessing warning: {e}")
        return image_path

def correct_ocr_handwriting_errors(text):
    """
    Repairs common character confusion errors found in messy handwritten OCR.
    """
    if not text:
        return ""

    result = text

    for pattern, replacement in COMMON_OCR_WORD_CORRECTIONS.items():
        def replace_with_case(match):
            matched = match.group(0)
            if matched.isupper():
                return replacement.upper()
            elif matched[0].isupper():
                return replacement.capitalize()
            return replacement

        result = re.sub(pattern, replace_with_case, result, flags=re.IGNORECASE)

    # Fix digit/letter mixups inside words (e.g. "c0de" -> "code", "n0te" -> "note")
    result = re.sub(r'([a-zA-Z])0([a-zA-Z])', r'\g<1>o\g<2>', result)
    result = re.sub(r'([a-zA-Z])1([a-zA-Z])', r'\g<1>l\g<2>', result)

    # Fix spaced contractions like "don ' t" -> "don't"
    result = re.sub(r'([a-zA-Z]+)\s*[\'’`]\s*([a-zA-Z]+)', r"\1'\2", result)
    result = re.sub(r'[ \t]+', ' ', result)

    return result

def expand_abbreviations_and_shortforms(text):
    """
    Expands common handwritten shortforms and abbreviations to full clear English,
    preserving exact punctuation, linebreaks, and token capitalization.
    """
    if not text:
        return ""

    tokens = re.split(r'(\s+|[.,!?;:\(\)\[\]\{\}"\'])', text)
    result = []

    for token in tokens:
        token_clean = token.strip()
        token_lower = token_clean.lower()
        if token_lower in SHORTHAND_WORDS:
            expansion = SHORTHAND_WORDS[token_lower]
            if token_clean.isupper() and len(token_clean) > 2:
                expansion = expansion.upper()
            elif token_clean and token_clean[0].isupper():
                expansion = expansion.capitalize()
            result.append(expansion)
        else:
            result.append(token)

    return "".join(result)

def extract_handwriting_text(image_path):
    """
    Transcribes handwritten & printed text using PyTorch EasyOCR,
    followed by multi-stage error correction and shorthand expansion.
    """
    prepped_path = preprocess_handwriting_image(image_path)
    target_path = prepped_path if os.path.exists(prepped_path) else image_path

    raw_text = ""
    reader = get_ocr_reader()

    if reader:
        try:
            results = reader.readtext(target_path, detail=0, paragraph=True)
            if results:
                raw_text = "\n\n".join([r.strip() for r in results if r.strip()])
        except Exception as e:
            print(f"EasyOCR extraction error: {e}")

    # Fallback to pytesseract if EasyOCR didn't find text
    if not raw_text:
        try:
            import pytesseract
            with Image.open(target_path) as img:
                raw_text = pytesseract.image_to_string(img).strip()
        except Exception:
            pass

    if prepped_path != image_path and os.path.exists(prepped_path):
        try:
            os.remove(prepped_path)
        except Exception:
            pass

    if not raw_text:
        return ""

    # Stage 1: Correct OCR character errors
    corrected_text = correct_ocr_handwriting_errors(raw_text)

    # Stage 2: Expand shortforms & abbreviations
    fully_expanded_text = expand_abbreviations_and_shortforms(corrected_text)

    return fully_expanded_text

def segment_text_into_notes(extracted_text, original_filename="", metadata=None):
    """
    Analyzes expanded text and segments it into multiple distinct, structured notes.
    """
    text = (extracted_text or "").strip()
    clean_base = os.path.splitext(original_filename)[0].replace('_', ' ').replace('-', ' ').title() if original_filename else "Extracted Note"

    if not text:
        return [{
            "title": clean_base,
            "content": f"Handwritten notes digitized from {original_filename or 'image'}.\n\nCleaned onto pure white canvas. Add your annotations here.",
            "raw_text": "",
            "extracted_text": "",
            "tags": ["white-canvas", "handwritten"],
            "handwriting_style": "font-caveat",
            "segment_index": 0
        }]

    raw_blocks = re.split(r'\n\s*\n+', text)
    section_patterns = re.findall(r'(?:^|\n)(?:#+\s*|[0-9]+[\.\)]\s*|[A-Z][A-Za-z\s]{2,30}:)', text)

    notes = []

    if len(raw_blocks) > 1 and (len(section_patterns) >= 2 or len(raw_blocks) >= 2):
        for idx, block in enumerate(raw_blocks):
            block_clean = block.strip()
            if not block_clean or len(block_clean) < 5:
                continue

            lines = [l.strip() for l in block_clean.split('\n') if l.strip()]
            first_line = lines[0] if lines else f"Topic {idx + 1}"

            candidate_title = re.sub(r'^[#0-9\.\-\*\:\s]+', '', first_line).strip()
            if len(candidate_title) > 45:
                candidate_title = candidate_title[:42] + "..."
            if not candidate_title:
                candidate_title = f"{clean_base} - Part {idx + 1}"

            content_body = "\n".join(lines[1:]) if len(lines) > 1 else lines[0]

            tags = ["handwritten", "white-canvas"]
            lower_b = block_clean.lower()
            style = "font-caveat"

            if any(k in lower_b for k in ["action", "todo", "task", "assign"]):
                tags.append("action-items")
                style = "font-kalam"
            elif any(k in lower_b for k in ["architecture", "diagram", "system", "design", "flow", "database", "api"]):
                tags.append("architecture")
                style = "font-architect"
            elif any(k in lower_b for k in ["summary", "key", "takeaway", "conclusion"]):
                tags.append("summary")
                style = "font-caveat"

            notes.append({
                "title": candidate_title.title(),
                "content": content_body or block_clean,
                "raw_text": block_clean,
                "extracted_text": block_clean,
                "tags": list(set(tags)),
                "handwriting_style": style,
                "segment_index": idx
            })

    if not notes:
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        first_line = lines[0] if lines else clean_base
        first_title = re.sub(r'^[#0-9\.\-\*\:\s]+', '', first_line).strip()
        if len(first_title) > 40:
            first_title = first_title[:38] + "..."

        notes.append({
            "title": first_title.title() if first_title else clean_base,
            "content": text,
            "raw_text": text,
            "extracted_text": text,
            "tags": ["handwritten", "white-canvas"],
            "handwriting_style": "font-caveat",
            "segment_index": 0
        })

    return notes
