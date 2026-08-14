import os
import re
import io
import json
import base64
import urllib.request
import urllib.error
from PIL import Image

_EASYOCR_READER = None

# Common English shorthand dictionary for local fallback
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

COMMON_OCR_WORD_CORRECTIONS = {
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
    r'\bclata\b': 'data',
    r'\bclatabase\b': 'database',
    r'\bclraw\b': 'draw',
    r'\bclate\b': 'date',
    r'\bclrive\b': 'drive',
    r'\bclocument\b': 'document',
    r'\bcletail\b': 'detail',
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

def correct_ocr_handwriting_errors(text):
    """Repairs common character confusion errors in OCR output."""
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

    result = re.sub(r'([a-zA-Z])0([a-zA-Z])', r'\g<1>o\g<2>', result)
    result = re.sub(r'([a-zA-Z])1([a-zA-Z])', r'\g<1>l\g<2>', result)
    result = re.sub(r'([a-zA-Z]+)\s*[\'’`]\s*([a-zA-Z]+)', r"\1'\2", result)
    result = re.sub(r'[ \t]+', ' ', result)
    return result

def expand_abbreviations_and_shortforms(text):
    """Expands common handwritten shortforms and abbreviations to full clear English."""
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

CANDIDATE_GEMINI_MODELS = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-2.5-pro",
    "gemini-1.5-pro"
]

def transcribe_with_gemini(image_path, api_key=None):
    """
    Transcribes handwritten text from image using Gemini Flash Vision.
    Tries active model versions with both SDK and Direct REST fallback.
    """
    key = (api_key or os.environ.get("GEMINI_API_KEY") or "").strip()
    if not key:
        print("[OCR] No Gemini API key provided. Using local PyTorch engine.")
        return None

    print(f"[OCR] Transcribing with Gemini Vision API (Key prefix: {key[:6]}...)...")

    prompt = (
        "You are an expert handwriting transcription assistant.\n"
        "Carefully transcribe all handwritten and printed English text from this notebook/document image into clear, accurate plain text.\n"
        "Rules:\n"
        "1. Accurately decipher cursive, messy handwriting, notes, and abbreviations.\n"
        "2. Preserve the logical structure, headings, bullet points, and numbered lists.\n"
        "3. Expand handwritten shorthand (e.g. w/, b/c, mgmt, reqs, arch, db) into clear words.\n"
        "4. Return ONLY the transcribed plain text notes without conversational preamble or conversational ending."
    )

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    ext = os.path.splitext(image_path)[1].lower().replace('.', '')
    mime_type = "image/jpeg" if ext in ("jpg", "jpeg") else (f"image/{ext}" if ext else "image/jpeg")

    # Method 1: Google GenAI SDK
    for model_name in CANDIDATE_GEMINI_MODELS:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=key)
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt
                ]
            )
            if response and response.text:
                print(f"[OCR] Successfully transcribed with GenAI SDK ({model_name})!")
                return response.text.strip()
        except Exception as e:
            print(f"[OCR] GenAI SDK ({model_name}) attempt: {e}")

    # Method 2: Direct Google AI Studio REST Endpoint
    b64_data = base64.b64encode(image_bytes).decode('utf-8')
    for model_name in CANDIDATE_GEMINI_MODELS:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={key}"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "inline_data": {
                                    "mime_type": mime_type,
                                    "data": b64_data
                                }
                            },
                            {
                                "text": prompt
                            }
                        ]
                    }
                ]
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        transcribed = parts[0]["text"].strip()
                        print(f"[OCR] Successfully transcribed via direct REST ({model_name})!")
                        return transcribed
        except urllib.error.HTTPError as http_err:
            err_body = http_err.read().decode('utf-8', errors='ignore')
            print(f"[OCR] REST {model_name} HTTP {http_err.code}: {err_body}")
        except Exception as rest_err:
            print(f"[OCR] REST {model_name} error: {rest_err}")

    print("[OCR] All Gemini transcription attempts failed. Falling back to local PyTorch OCR.")
    return None

def extract_handwriting_text(image_path, api_key=None):
    """
    Primary handwriting transcription engine.
    Tries Gemini Flash Vision first (if API key available), then falls back to local PyTorch OCR + NLP expander.
    """
    gemini_text = transcribe_with_gemini(image_path, api_key)
    if gemini_text:
        return gemini_text

    # Local PyTorch EasyOCR Fallback
    raw_text = ""
    reader = get_ocr_reader()
    if reader:
        try:
            results = reader.readtext(image_path, detail=0, paragraph=True)
            if results:
                raw_text = "\n\n".join([r.strip() for r in results if r.strip()])
        except Exception as e:
            print(f"[OCR] Local OCR error: {e}")

    if not raw_text:
        try:
            import pytesseract
            with Image.open(image_path) as img:
                raw_text = pytesseract.image_to_string(img).strip()
        except Exception:
            pass

    if not raw_text:
        return ""

    corrected = correct_ocr_handwriting_errors(raw_text)
    return expand_abbreviations_and_shortforms(corrected)

def segment_text_into_notes(extracted_text, original_filename="", metadata=None):
    """
    Analyzes plain text and segments it into multiple distinct, structured notes.
    """
    text = (extracted_text or "").strip()
    clean_base = os.path.splitext(original_filename)[0].replace('_', ' ').replace('-', ' ').title() if original_filename else "Extracted Note"

    if not text:
        return [{
            "title": clean_base,
            "content": f"Notes extracted from {original_filename or 'image'}.\n\nAdd your annotations here.",
            "tags": ["notes", "extracted"],
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

            tags = ["notes"]
            lower_b = block_clean.lower()
            if any(k in lower_b for k in ["action", "todo", "task", "assign"]):
                tags.append("action-items")
            elif any(k in lower_b for k in ["architecture", "system", "design", "database", "api", "statistics"]):
                tags.append("statistics")
            elif any(k in lower_b for k in ["summary", "key", "takeaway", "conclusion"]):
                tags.append("summary")

            notes.append({
                "title": candidate_title.title(),
                "content": content_body or block_clean,
                "tags": list(set(tags)),
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
            "tags": ["notes"],
            "segment_index": 0
        })

    return notes
