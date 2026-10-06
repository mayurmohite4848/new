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

import time
try:
    from backend.db import log_llm_telemetry
except ImportError:
    from db import log_llm_telemetry

CANDIDATE_GEMINI_MODELS = [
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-pro-preview"
]

def transcribe_with_gemini(image_path, api_key=None):
    """
    Transcribes handwritten text, mathematical equations (LaTeX), and diagrams (Mermaid)
    from an image using the Gemini Interactions API (gemini-3.6-flash / 3.5-flash) with LLMOps telemetry.
    """
    start_time = time.time()
    key = (api_key or os.environ.get("GEMINI_API_KEY") or "").strip()
    if not key:
        print("[OCR] No Gemini API key provided. Using local PyTorch engine.")
        return None

    print("[OCR] Transcribing with Gemini Interactions API (Multi-Modal Math & Diagram Engine)...")

    prompt = (
        "You are an expert multi-modal academic handwriting transcription assistant.\n"
        "Carefully transcribe all handwritten and printed English text, mathematical equations, and diagrams from this notebook page into ONE complete, well-organized note.\n\n"
        "Formatting & Extraction Rules:\n"
        "1. MAIN HEADING: Put the main topic/heading on the very first line (e.g. # Advanced Exploratory Data Analysis).\n"
        "2. ACCURACY: Accurately decipher cursive, messy handwriting, notes, bullets, and abbreviations.\n"
        "3. MATHEMATICAL EQUATIONS (LaTeX): Convert all handwritten math equations, formulas, variables, Greek letters, summations, integrals, fractions, and matrices into standard LaTeX/KaTeX syntax:\n"
        "   - Use inline math `$equation$` for formulas inside sentences (e.g., `$f(x) = \\sigma(W^T x + b)$` or `$\\mu = \\frac{1}{N} \\sum x_i$`).\n"
        "   - Use block display math `$$equation$$` on separate lines for major equations.\n"
        "4. DIAGRAMS & FLOWCHARTS (Mermaid): If there are hand-drawn sketches, workflow charts, flowcharts, decision trees, state machines, sequence diagrams, or system architecture boxes, transcribe and convert them into clean, valid Mermaid diagrams inside codeblocks:\n"
        "   ```mermaid\n"
        "   graph TD\n"
        "       A[Raw Data] --> B[Preprocessing]\n"
        "       B --> C[Feature Engineering]\n"
        "   ```\n"
        "5. EXPAND SHORTHAND: Expand common handwritten shorthand (e.g. w/, b/c, mgmt, reqs, arch, db, fn) into clear standard terms.\n"
        "6. STRUCTURE: Organize clearly into sections using Markdown headers (`##`, `###`), bullet points, and definitions.\n"
        "7. OUTPUT ONLY: Return ONLY the transcribed note without conversational intro or outro."
    )

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    b64_image = base64.b64encode(image_bytes).decode('utf-8')
    ext = os.path.splitext(image_path)[1].lower().replace('.', '')
    mime_type = "image/jpeg" if ext in ("jpg", "jpeg") else (f"image/{ext}" if ext else "image/jpeg")

    p_tokens = int(len(prompt.split()) * 1.3) + 258  # 258 image tokens estimate

    # Method 1: Google GenAI SDK Interactions API
    for model_name in CANDIDATE_GEMINI_MODELS:
        try:
            from google import genai

            client = genai.Client(api_key=key)
            interaction = client.interactions.create(
                model=model_name,
                input=[
                    {"type": "text", "text": prompt},
                    {
                        "type": "image",
                        "data": b64_image,
                        "mime_type": mime_type
                    }
                ]
            )
            if interaction and interaction.output_text:
                latency_ms = int((time.time() - start_time) * 1000)
                result_text = interaction.output_text.strip()
                c_tokens = int(len(result_text.split()) * 1.3)
                log_llm_telemetry(
                    request_type="ocr_transcription",
                    model_used=model_name,
                    is_fallback=False,
                    latency_ms=latency_ms,
                    prompt_tokens=p_tokens,
                    completion_tokens=c_tokens,
                    total_tokens=p_tokens + c_tokens,
                    estimated_cost_usd=round((p_tokens * 0.000075 + c_tokens * 0.0003) / 1000, 6),
                    status="success"
                )
                print(f"[OCR] Successfully transcribed with GenAI Interactions API ({model_name}) in {latency_ms}ms!")
                return result_text
        except Exception as e:
            print(f"[OCR] GenAI Interactions ({model_name}) attempt: {e}")

    # Method 2: Direct Google AI Studio Interactions REST Endpoint
    for model_name in CANDIDATE_GEMINI_MODELS:
        try:
            url = "https://generativelanguage.googleapis.com/v1beta/interactions"
            payload = {
                "model": model_name,
                "input": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image",
                        "data": b64_image,
                        "mime_type": mime_type
                    }
                ]
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": key,
                    "Api-Revision": "2026-05-20"
                }
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                steps = data.get("steps", [])
                output_texts = []
                for step in steps:
                    if step.get("type") == "model_output":
                        for c in step.get("content", []):
                            if c.get("type") == "text" and "text" in c:
                                output_texts.append(c["text"])
                latency_ms = int((time.time() - start_time) * 1000)
                if output_texts:
                    transcribed = "\n".join(output_texts).strip()
                    c_tokens = int(len(transcribed.split()) * 1.3)
                    log_llm_telemetry(
                        request_type="ocr_transcription",
                        model_used=model_name,
                        is_fallback=False,
                        latency_ms=latency_ms,
                        prompt_tokens=p_tokens,
                        completion_tokens=c_tokens,
                        total_tokens=p_tokens + c_tokens,
                        estimated_cost_usd=round((p_tokens * 0.000075 + c_tokens * 0.0003) / 1000, 6),
                        status="success"
                    )
                    print(f"[OCR] Successfully transcribed via direct Interactions REST ({model_name}) in {latency_ms}ms!")
                    return transcribed
                if "output_text" in data and data["output_text"]:
                    transcribed = data["output_text"].strip()
                    c_tokens = int(len(transcribed.split()) * 1.3)
                    log_llm_telemetry(
                        request_type="ocr_transcription",
                        model_used=model_name,
                        is_fallback=False,
                        latency_ms=latency_ms,
                        prompt_tokens=p_tokens,
                        completion_tokens=c_tokens,
                        total_tokens=p_tokens + c_tokens,
                        estimated_cost_usd=round((p_tokens * 0.000075 + c_tokens * 0.0003) / 1000, 6),
                        status="success"
                    )
                    print(f"[OCR] Successfully transcribed via direct Interactions REST ({model_name}) in {latency_ms}ms!")
                    return transcribed
        except urllib.error.HTTPError as http_err:
            err_body = http_err.read().decode('utf-8', errors='ignore')
            print(f"[OCR] Interactions REST {model_name} HTTP {http_err.code}: {err_body}")
        except Exception as rest_err:
            print(f"[OCR] Interactions REST {model_name} error: {rest_err}")

    print("[OCR] All Gemini transcription attempts failed. Falling back to local PyTorch OCR.")
    return None

def extract_handwriting_text(image_path, api_key=None):
    """
    Primary handwriting transcription engine with automatic zero-downtime hybrid fallback.
    Tries Gemini Vision first (if API key available), then falls back to local PyTorch EasyOCR + NLP corrector.
    """
    start_time = time.time()
    key = (api_key or os.environ.get("GEMINI_API_KEY") or "").strip()

    gemini_text = transcribe_with_gemini(image_path, api_key)
    if gemini_text:
        return gemini_text

    # Local PyTorch EasyOCR Fallback
    raw_text = ""
    fallback_reason = "no_api_key" if not key else "gemini_api_unavailable"
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

    latency_ms = int((time.time() - start_time) * 1000)
    
    if not raw_text:
        log_llm_telemetry(
            request_type="ocr_transcription",
            model_used="pytorch-easyocr-local",
            is_fallback=True,
            fallback_reason=fallback_reason,
            latency_ms=latency_ms,
            status="error",
            error_message="No text detected by local OCR engine"
        )
        return ""

    corrected = correct_ocr_handwriting_errors(raw_text)
    expanded = expand_abbreviations_and_shortforms(corrected)

    c_tokens = int(len(expanded.split()) * 1.3)
    log_llm_telemetry(
        request_type="ocr_transcription",
        model_used="pytorch-easyocr-local",
        is_fallback=True,
        fallback_reason=fallback_reason,
        latency_ms=latency_ms,
        completion_tokens=c_tokens,
        total_tokens=c_tokens,
        status="fallback"
    )
    return expanded

def segment_text_into_notes(extracted_text, original_filename="", metadata=None):
    """
    Keeps everything from one image in ONE single complete note.
    Extracts the main title from the first heading line while preserving all content.
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

    # Extract first line as title candidate
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    first_line = lines[0] if lines else clean_base
    title_candidate = re.sub(r'^[#0-9\.\-\*\:\s]+', '', first_line).strip()
    
    # If first line has a colon, take before colon or clean title
    if ":" in title_candidate and len(title_candidate.split(":")[0]) > 4:
        title_candidate = title_candidate.split(":")[0].strip()

    if len(title_candidate) > 50:
        title_candidate = title_candidate[:47] + "..."

    final_title = title_candidate.title() if title_candidate else clean_base

    # Generate smart tags based on text content
    tags = ["notes"]
    lower_text = text.lower()
    if any(k in lower_text for k in ["statistic", "data", "analysis", "parameter", "sample", "inferential", "descriptive"]):
        tags.append("statistics")
    if any(k in lower_text for k in ["action", "todo", "task", "assign"]):
        tags.append("action-items")
    if any(k in lower_text for k in ["architecture", "database", "system", "design", "api"]):
        tags.append("engineering")
    if any(k in lower_text for k in ["summary", "key", "takeaway", "conclusion"]):
        tags.append("summary")

    # Return ONE single complete note for the whole page
    return [{
        "title": final_title,
        "content": text,
        "tags": list(set(tags)),
        "segment_index": 0
    }]
