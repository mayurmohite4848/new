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

def query_notebook_rag(notebook, user_query, chat_history=None, api_key=None, current_page_number=None, scope="all_pages"):
    """
    Executes a Grounded RAG Query against the notebook using Gemini 3.6 Flash.
    Supports targeting the active page currently in reader or all pages in the notebook.
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

    page_focus_hint = ""
    if current_page_number:
        if scope == "current_page":
            page_focus_hint = f"\nSCOPE DIRECTIVE: Focus specifically on Page {current_page_number}. The user has set their query scope strictly to Page {current_page_number}.\n"
        else:
            page_focus_hint = f"\nCONTEXT HINT: The user is currently reading Page {current_page_number}. If the user refers to 'this page', 'here', or 'current notes', resolve it to Page {current_page_number}.\n"

    prompt = f"{system_instruction}{page_focus_hint}\n{context}\n\n"
    
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

    # Check if user asks specifically for current page or general summary
    is_asking_for_this_page = bool(current_page_number and any(w in user_query.lower() for w in ["this page", "here", "current page", "explain page", "summarize page"]))

    matching_pages = []
    for p in notebook.get('pages', []):
        p_num = p.get('page_number', 1)
        p_title = (p.get('title') or '').lower()
        p_content = (p.get('content') or '').lower()
        p_extracted = (p.get('extracted_text') or '').lower()
        full_page_text = f"{p_title} {p_content} {p_extracted}"

        score = sum(1 for kw in keywords if kw in full_page_text)
        if (is_asking_for_this_page or scope == "current_page") and p_num == current_page_number:
            score += 100 # Strongly prioritize current page
        
        if score > 0 or (scope == "current_page" and p_num == current_page_number):
            matching_pages.append((p_num, score, p))

    matching_pages.sort(key=lambda x: x[1], reverse=True)

    if matching_pages:
        top_pages = matching_pages[:3]
        citations = [p[0] for p in top_pages]
        snippets = []
        for p_num, _, page in top_pages:
            p_title = page.get('title') or f"Page {p_num}"
            raw = (page.get('content') or page.get('extracted_text') or "")[:350]
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

# =========================================================================
# GLOBAL WORKSPACE FEDERATED RAG & CROSS-NOTEBOOK CITATIONS
# =========================================================================

def format_workspace_context(workspace_data):
    """
    Formats the complete multi-notebook and standalone note knowledge base
    into indexed, hierarchical chunks for cross-document Grounded RAG.
    """
    lines = []
    notebooks = workspace_data.get("notebooks", [])
    notes = workspace_data.get("notes", [])

    lines.append("=== GLOBAL KNOWLEDGE BASE START ===")
    lines.append(f"TOTAL NOTEBOOKS: {len(notebooks)} | TOTAL STANDALONE NOTES: {len(notes)}\n")

    # 1. Multi-Page Notebooks
    if notebooks:
        lines.append("=== SECTION 1: MULTI-PAGE NOTEBOOKS ===")
        for nb in notebooks:
            nb_id = nb.get("id")
            nb_title = nb.get("title", "Untitled Notebook")
            subject = nb.get("subject_tag", "General")
            pages = nb.get("pages", [])
            lines.append(f"\n=======================================================")
            lines.append(f"NOTEBOOK [ID: {nb_id}]: \"{nb_title}\" (Subject: {subject}, {len(pages)} Pages)")
            lines.append(f"=======================================================")
            
            for p in pages:
                p_num = p.get("page_number", 1)
                p_title = p.get("title") or f"Page {p_num}"
                p_content = (p.get("content") or p.get("extracted_text") or "").strip()
                lines.append(f"\n--- [Notebook: \"{nb_title}\" | Page {p_num}: {p_title}] ---")
                lines.append(p_content if p_content else "(Empty page or diagram)")
                lines.append(f"--- [End Notebook: \"{nb_title}\" | Page {p_num}] ---")

    # 2. Standalone Single Notes
    if notes:
        lines.append("\n\n=== SECTION 2: STANDALONE SINGLE NOTES ===")
        for n in notes:
            n_id = n.get("id")
            n_title = n.get("title", "Untitled Note")
            tags = ", ".join(n.get("tags") or [])
            n_content = (n.get("content") or n.get("extracted_text") or "").strip()
            lines.append(f"\n--- [Note [ID: {n_id}]: \"{n_title}\"{f' (Tags: {tags})' if tags else ''}] ---")
            lines.append(n_content if n_content else "(Empty note)")
            lines.append(f"--- [End Note: \"{n_title}\"] ---")

    lines.append("\n=== GLOBAL KNOWLEDGE BASE END ===")
    return "\n".join(lines)

def extract_workspace_citations(text, workspace_data=None):
    """
    Extracts cross-notebook and standalone note citations from generated text.
    Returns structured citation objects:
      [
        {
          "type": "notebook_page",
          "notebook_id": 1,
          "notebook_title": "Machine Learning",
          "page_number": 3,
          "label": "Machine Learning • Page 3",
          "raw": "[Notebook: Machine Learning | Page 3]"
        },
        {
          "type": "note",
          "note_id": 2,
          "note_title": "Calculus Formulas",
          "label": "Note: Calculus Formulas",
          "raw": "[Note: Calculus Formulas]"
        }
      ]
    """
    if not text:
        return []

    citations = []
    seen_keys = set()

    notebooks_by_title = {}
    notes_by_title = {}
    if workspace_data:
        for nb in workspace_data.get("notebooks", []):
            clean_t = (nb.get("title") or "").strip().lower()
            if clean_t:
                notebooks_by_title[clean_t] = nb
        for n in workspace_data.get("notes", []):
            clean_t = (n.get("title") or "").strip().lower()
            if clean_t:
                notes_by_title[clean_t] = n

    # Pattern 1: [Notebook: Title | Page X] or [Title | Page X]
    nb_matches = re.finditer(r'\[(?:Notebook\s*:\s*)?["\']?([^|\]]+?)["\']?\s*\|\s*Page\s*([0-9,\s]+)\]', text, re.IGNORECASE)
    for m in nb_matches:
        raw_title = m.group(1).strip()
        num_str = m.group(2).strip()
        num_parts = re.split(r'[,;\s]+', num_str)
        
        matched_nb = notebooks_by_title.get(raw_title.lower())
        nb_id = matched_nb.get("id") if matched_nb else None
        official_title = matched_nb.get("title") if matched_nb else raw_title

        for np in num_parts:
            if np.isdigit():
                p_num = int(np)
                key = f"nb_{nb_id or raw_title}_{p_num}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    citations.append({
                        "type": "notebook_page",
                        "notebook_id": nb_id,
                        "notebook_title": official_title,
                        "page_number": p_num,
                        "label": f"{official_title} • Page {p_num}",
                        "raw": m.group(0)
                    })

    # Pattern 2: [Note: Title] or [Note: "Title"]
    note_matches = re.finditer(r'\[Note\s*:\s*["\']?([^\]]+?)["\']?\]', text, re.IGNORECASE)
    for m in note_matches:
        raw_title = m.group(1).strip()
        matched_n = notes_by_title.get(raw_title.lower())
        note_id = matched_n.get("id") if matched_n else None
        official_title = matched_n.get("title") if matched_n else raw_title
        key = f"note_{note_id or raw_title}"
        if key not in seen_keys:
            seen_keys.add(key)
            citations.append({
                "type": "note",
                "note_id": note_id,
                "note_title": official_title,
                "label": f"Note: {official_title}",
                "raw": m.group(0)
            })

    # Pattern 3: Fallback [Page X] if only single page citations appear
    if not citations:
        page_nums = extract_page_citations(text)
        for pn in page_nums:
            citations.append({
                "type": "page",
                "page_number": pn,
                "label": f"Page {pn}",
                "raw": f"[Page {pn}]"
            })

    return citations

def query_workspace_rag(workspace_data, user_query, chat_history=None, api_key=None):
    """
    Executes a Global Grounded RAG Query across all notebooks and standalone notes in the workspace.
    Synthesizes cross-notebook relationships with rigorous multi-document attribution.
    """
    notebooks = workspace_data.get("notebooks", [])
    notes = workspace_data.get("notes", [])

    if not notebooks and not notes:
        return {
            "reply": "Your knowledge base is empty! Create notes or upload handwritten notebook pages to ask questions across your library.",
            "citations": [],
            "model": "system",
            "source": "system"
        }

    chat_history = chat_history or []
    context = format_workspace_context(workspace_data)

    system_instruction = (
        "You are NoteExtract AI, an expert academic knowledge assistant and cross-document reasoning engine. "
        "You are answering questions across the user's ENTIRE workspace of handwritten notebooks and digitized lecture notes.\n\n"
        "MANDATORY MULTI-DOCUMENT CITATION RULES:\n"
        "1. When citing a notebook page, you MUST use the exact format: `[Notebook: Notebook Title | Page X]` (e.g. `[Notebook: Linear Algebra | Page 3]`).\n"
        "2. When citing a standalone note, you MUST use the format: `[Note: Note Title]` (e.g. `[Note: Quick Formulas]`).\n"
        "3. Highlight meaningful cross-links and connections when a concept from one notebook connects with, builds upon, or applies to another notebook.\n"
        "4. Structure your response with clean Markdown headings, bullet points, and exact source citations.\n"
        "5. If a topic is not found anywhere in their notes, state clearly: 'This is not mentioned in any of your uploaded notes.', and then offer a brief general explanation while clarifying it is outside their notes."
    )

    prompt = f"{system_instruction}\n\n{context}\n\n"

    if chat_history:
        prompt += "CONVERSATION HISTORY:\n"
        for msg in chat_history[-6:]:
            role_name = "User" if msg.get("role") == "user" else "Assistant"
            prompt += f"{role_name}: {msg.get('content', '')}\n"
        prompt += "\n"

    prompt += f"USER QUESTION: {user_query}\nASSISTANT ANSWER (Include [Notebook: Name | Page X] and [Note: Name] citations):"

    key = api_key or os.environ.get("GEMINI_API_KEY")

    # 1. Try Gemini GenAI Interactions API (gemini-3.6-flash / gemini-3.5-flash)
    if key:
        models_to_try = ["gemini-3.6-flash", "gemini-3.5-flash"]
        for model_name in models_to_try:
            try:
                url = "https://generativelanguage.googleapis.com/v1beta/interactions"
                payload = {
                    "model": model_name,
                    "input": [{"type": "text", "text": prompt}]
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
                with urllib.request.urlopen(req, timeout=35) as resp:
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
                        citations = extract_workspace_citations(reply_text, workspace_data)
                        return {
                            "reply": reply_text,
                            "citations": citations,
                            "model": model_name,
                            "source": "gemini-interactions-api"
                        }
                    if "output_text" in data and data["output_text"]:
                        reply_text = data["output_text"].strip()
                        citations = extract_workspace_citations(reply_text, workspace_data)
                        return {
                            "reply": reply_text,
                            "citations": citations,
                            "model": model_name,
                            "source": "gemini-interactions-api"
                        }
            except Exception as e:
                print(f"[Workspace RAG] Interactions API ({model_name}) error: {e}")

    # 2. Local Fallback Multi-Document Keyword Ranker
    print("[Workspace RAG] Using local multi-document fallback search...")
    query_words = set(re.findall(r'\w+', user_query.lower()))
    stopwords = {"what", "is", "are", "the", "a", "an", "how", "why", "where", "when", "can", "you", "tell", "me", "about", "in", "of", "and", "or", "for", "to"}
    keywords = query_words - stopwords

    scored_items = []

    # Rank notebook pages
    for nb in notebooks:
        nb_title = nb.get("title", "Untitled Notebook")
        for p in nb.get("pages", []):
            p_num = p.get("page_number", 1)
            p_title = p.get("title") or f"Page {p_num}"
            full_text = f"{nb_title} {p_title} {p.get('content', '')} {p.get('extracted_text', '')}".lower()
            score = sum(1 for kw in keywords if kw in full_text)
            if score > 0:
                scored_items.append({
                    "score": score,
                    "type": "notebook_page",
                    "notebook_id": nb.get("id"),
                    "notebook_title": nb_title,
                    "page_number": p_num,
                    "title": p_title,
                    "snippet": (p.get("content") or p.get("extracted_text") or "")[:280].strip()
                })

    # Rank standalone notes
    for n in notes:
        n_title = n.get("title", "Untitled Note")
        full_text = f"{n_title} {n.get('content', '')} {n.get('extracted_text', '')} {' '.join(n.get('tags') or [])}".lower()
        score = sum(1 for kw in keywords if kw in full_text)
        if score > 0:
            scored_items.append({
                "score": score,
                "type": "note",
                "note_id": n.get("id"),
                "note_title": n_title,
                "snippet": (n.get("content") or n.get("extracted_text") or "")[:280].strip()
            })

    scored_items.sort(key=lambda x: x["score"], reverse=True)

    if scored_items:
        top_items = scored_items[:4]
        citations = []
        snippets = []

        for it in top_items:
            if it["type"] == "notebook_page":
                cit_label = f"{it['notebook_title']} • Page {it['page_number']}"
                citations.append({
                    "type": "notebook_page",
                    "notebook_id": it["notebook_id"],
                    "notebook_title": it["notebook_title"],
                    "page_number": it["page_number"],
                    "label": cit_label,
                    "raw": f"[Notebook: {it['notebook_title']} | Page {it['page_number']}]"
                })
                snippets.append(f"**From [Notebook: {it['notebook_title']} | Page {it['page_number']}] ({it['title']}):**\n> {it['snippet']}...")
            else:
                cit_label = f"Note: {it['note_title']}"
                citations.append({
                    "type": "note",
                    "note_id": it["note_id"],
                    "note_title": it["note_title"],
                    "label": cit_label,
                    "raw": f"[Note: {it['note_title']}]"
                })
                snippets.append(f"**From [Note: {it['note_title']}]:**\n> {it['snippet']}...")

        reply_text = (
            f"Here are the relevant cross-document insights across your knowledge base for **\"{user_query}\"**:\n\n"
            + "\n\n".join(snippets)
            + "\n\n*(Tip: Add your Gemini API key in the navbar for automatic cross-notebook synthesis & multi-subject study guides!)*"
        )
        return {
            "reply": reply_text,
            "citations": citations,
            "model": "local-workspace-rag",
            "source": "local-fallback"
        }
    else:
        return {
            "reply": f"No direct mentions found for **\"{user_query}\"** across your {len(notebooks)} notebook(s) and {len(notes)} note(s).",
            "citations": [],
            "model": "local-workspace-rag",
            "source": "local-fallback"
        }

def find_cross_notebook_links(current_notebook, all_notebooks, threshold=2):
    """
    Computes semantic keyword overlap between the current notebook and other notebooks
    in the workspace to recommend related topics and cross-references.
    """
    if not current_notebook or not all_notebooks:
        return []

    curr_text = f"{current_notebook.get('title', '')} {current_notebook.get('subject_tag', '')} " + " ".join(
        (p.get("content") or "") for p in current_notebook.get("pages", [])
    ).lower()

    curr_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', curr_text))
    stopwords = {"this", "that", "with", "from", "have", "more", "also", "into", "page", "notes", "here", "they", "them", "some"}
    curr_keywords = curr_words - stopwords

    recommendations = []
    for other_nb in all_notebooks:
        if other_nb.get("id") == current_notebook.get("id"):
            continue

        other_text = f"{other_nb.get('title', '')} {other_nb.get('subject_tag', '')} " + " ".join(
            (p.get("content") or "") for p in other_nb.get("pages", [])
        ).lower()

        other_words = set(re.findall(r'\b[a-zA-Z]{4,}\b', other_text)) - stopwords
        common = curr_keywords.intersection(other_words)

        if len(common) >= threshold:
            recommendations.append({
                "notebook_id": other_nb.get("id"),
                "notebook_title": other_nb.get("title"),
                "subject_tag": other_nb.get("subject_tag"),
                "shared_topics": sorted(list(common))[:5],
                "score": len(common)
            })

    recommendations.sort(key=lambda x: x["score"], reverse=True)
    return recommendations[:3]
