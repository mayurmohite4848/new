import os
import re
import json
import urllib.request
import urllib.error

def extract_page_citations(text):
    """
    Extracts all [Page X] or [Page X, Page Y] citation numbers from the generated response.
    Returns a sorted list of unique integer page numbers.
    """
    if not text:
        return []
    
    # Matches patterns like [Page 1], [Page 2, Page 3], [Pages 1, 2], [Page 4]
    matches = re.findall(r'\[(?:Page|Pages)\s*([0-9,\s]+)\]', text, re.IGNORECASE)
    page_numbers = set()
    for m in matches:
        parts = re.split(r'[,;\s]+', m)
        for p in parts:
            if p.isdigit():
                page_numbers.add(int(p))
                
    # Also match plain (Page 1) or Page 1
    fallback_matches = re.findall(r'\bPage\s+(\d+)\b', text, re.IGNORECASE)
    for fm in fallback_matches:
        if fm.isdigit():
            page_numbers.add(int(fm))
            
    return sorted(list(page_numbers))

def format_notebook_context(notebook):
    """
    Formats multi-page notebook contents into clean, indexed chunks for RAG grounding.
    """
    lines = []
    lines.append(f"NOTEBOOK TITLE: {notebook.get('title', 'Untitled Notebook')}")
    lines.append(f"SUBJECT: {notebook.get('subject_tag', 'General')}")
    if notebook.get('description'):
        lines.append(f"DESCRIPTION: {notebook.get('description')}")
    lines.append(f"TOTAL PAGES: {len(notebook.get('pages', []))}\n")
    lines.append("=== NOTEBOOK PAGES START ===")

    for p in notebook.get('pages', []):
        p_num = p.get('page_number', 1)
        p_title = p.get('title') or f"Page {p_num}"
        p_content = (p.get('content') or p.get('extracted_text') or "").strip()
        lines.append(f"\n--- BEGIN PAGE {p_num}: {p_title} ---")
        lines.append(p_content if p_content else "(Empty page or diagram)")
        lines.append(f"--- END PAGE {p_num} ---")

    lines.append("\n=== NOTEBOOK PAGES END ===")
    return "\n".join(lines)

def query_notebook_rag(notebook, user_query, chat_history=None, api_key=None):
    """
    Executes a Grounded RAG Query against the notebook using Gemini 3.6 Flash.
    Returns:
      {
        "reply": str,
        "citations": list[int],
        "model": str,
        "source": str
      }
    """
    if not notebook or not notebook.get('pages'):
        return {
            "reply": "This notebook does not have any pages to reference yet. Please add handwritten photos or notes first!",
            "citations": [],
            "model": "system",
            "source": "system"
        }

    chat_history = chat_history or []
    context = format_notebook_context(notebook)

    system_instruction = (
        "You are NoteExtract AI, an expert, rigorous academic research assistant and study tutor. "
        "You are helping the user study and answer questions strictly based on their handwritten and digitized lecture notes.\n\n"
        "MANDATORY CITATION RULES:\n"
        "1. Every single factual claim, formula, definition, or answer MUST cite the exact page number where it appears using the format `[Page X]` (e.g. `[Page 1]` or `[Page 2, Page 3]`).\n"
        "2. If the user asks for a summary, formula cheat sheet, quiz, or explanation, organize it cleanly with Markdown headings, bullet points, and exact page citations.\n"
        "3. If the answer cannot be found in the notebook notes, explicitly state: 'This is not mentioned in your notebook notes.', and then if helpful, offer a brief general explanation while clarifying it is outside their notes.\n"
        "4. Be concise, highly accurate, and academic in tone."
    )

    prompt = f"{system_instruction}\n\n{context}\n\n"
    
    # Append recent conversation history
    if chat_history:
        prompt += "CONVERSATION HISTORY:\n"
        for msg in chat_history[-6:]:  # Keep last 6 messages
            role_name = "User" if msg.get("role") == "user" else "Assistant"
            prompt += f"{role_name}: {msg.get('content', '')}\n"
        prompt += "\n"

    prompt += f"USER QUESTION: {user_query}\nASSISTANT ANSWER (Remember to include [Page X] citations):"

    key = api_key or os.environ.get("GEMINI_API_KEY")
    
    # 1. Try Gemini GenAI Interactions API (gemini-3.6-flash / gemini-3.5-flash)
    if key:
        models_to_try = ["gemini-3.6-flash", "gemini-3.5-flash"]
        for model_name in models_to_try:
            try:
                url = "https://generativelanguage.googleapis.com/v1beta/interactions"
                payload = {
                    "model": model_name,
                    "input": [
                        {
                            "type": "text",
                            "text": prompt
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
                    if output_texts:
                        reply_text = "\n".join(output_texts).strip()
                        citations = extract_page_citations(reply_text)
                        return {
                            "reply": reply_text,
                            "citations": citations,
                            "model": model_name,
                            "source": "gemini-interactions-api"
                        }
                    if "output_text" in data and data["output_text"]:
                        reply_text = data["output_text"].strip()
                        citations = extract_page_citations(reply_text)
                        return {
                            "reply": reply_text,
                            "citations": citations,
                            "model": model_name,
                            "source": "gemini-interactions-api"
                        }
            except Exception as e:
                print(f"[RAG] Interactions API ({model_name}) error: {e}")

    # 2. Local Fallback Semantic Keyword Retrieval Engine (When offline or no API key)
    print("[RAG] Using local keyword search fallback engine...")
    query_words = set(re.findall(r'\w+', user_query.lower()))
    stopwords = {"what", "is", "are", "the", "a", "an", "how", "why", "where", "when", "can", "you", "tell", "me", "about", "in", "of", "and", "or", "for", "to"}
    keywords = query_words - stopwords

    matching_pages = []
    for p in notebook.get('pages', []):
        p_num = p.get('page_number', 1)
        p_text = (p.get('content') or p.get('extracted_text') or "").lower()
        score = sum(1 for kw in keywords if kw in p_text)
        if score > 0:
            matching_pages.append((p_num, score, p))

    matching_pages.sort(key=lambda x: x[1], reverse=True)

    if matching_pages:
        top_pages = matching_pages[:3]
        citations = [p[0] for p in top_pages]
        snippets = []
        for p_num, _, page in top_pages:
            p_title = page.get('title') or f"Page {p_num}"
            raw = (page.get('content') or page.get('extracted_text') or "")[:280]
            snippets.append(f"**From [Page {p_num}] ({p_title}):**\n> {raw.strip()}...")
        
        reply_text = (
            f"Here are the relevant sections found in your notebook for **\"{user_query}\"**:\n\n"
            + "\n\n".join(snippets)
            + "\n\n*(Tip: Set your free Gemini API key in the navbar for deep conversational reasoning & automatic study quizzes!)*"
        )
        return {
            "reply": reply_text,
            "citations": citations,
            "model": "local-keyword-rag",
            "source": "local-fallback"
        }
    else:
        return {
            "reply": f"No direct mentions found for **\"{user_query}\"** across the {len(notebook.get('pages', []))} page(s) in this notebook.",
            "citations": [],
            "model": "local-keyword-rag",
            "source": "local-fallback"
        }
