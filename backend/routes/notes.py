import os
import json
import urllib.request
import urllib.error
from flask import Blueprint, request, jsonify, current_app
from backend.db import (
    get_all_notes,
    get_note_by_id,
    create_note,
    batch_create_notes,
    update_note,
    delete_note,
    get_stats
)
from backend.services.image_processor import process_and_save_image, generate_minimal_ai_enhancements
from backend.services.ocr_service import CANDIDATE_GEMINI_MODELS

notes_bp = Blueprint("notes_bp", __name__)

@notes_bp.route("/api/verify-key", methods=["POST"])
def verify_gemini_key():
    """Verifies a Gemini API key using the Interactions API."""
    data = request.get_json() or {}
    key = (data.get("api_key") or request.headers.get("X-Gemini-Key") or "").strip()
    if not key:
        return jsonify({"valid": False, "error": "No API key provided."}), 400

    last_error = ""
    # Test with google-genai interactions SDK first
    for model_name in CANDIDATE_GEMINI_MODELS:
        try:
            from google import genai
            client = genai.Client(api_key=key)
            interaction = client.interactions.create(
                model=model_name,
                input="Hello, answer with 'ok'."
            )
            if interaction and interaction.output_text:
                return jsonify({
                    "valid": True,
                    "model": model_name,
                    "message": f"Successfully verified! Connected to {model_name} via Interactions API."
                }), 200
        except Exception as sdk_ex:
            last_error = str(sdk_ex)

    # Test with direct Interactions REST endpoint
    for model_name in CANDIDATE_GEMINI_MODELS:
        try:
            url = "https://generativelanguage.googleapis.com/v1beta/interactions"
            payload = {
                "model": model_name,
                "input": "Hello"
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
            with urllib.request.urlopen(req, timeout=12) as resp:
                if resp.status == 200:
                    return jsonify({
                        "valid": True,
                        "model": model_name,
                        "message": f"Successfully verified! Connected to {model_name}."
                    }), 200
        except urllib.error.HTTPError as he:
            err_text = he.read().decode('utf-8', errors='ignore')
            try:
                err_json = json.loads(err_text)
                msg = err_json.get("error", {}).get("message", err_text)
            except Exception:
                msg = err_text
            last_error = f"HTTP {he.code}: {msg}"
        except Exception as ex:
            last_error = str(ex)

    return jsonify({
        "valid": False,
        "error": f"API Key verification failed: {last_error}"
    }), 400

@notes_bp.route("/api/notes", methods=["GET"])
def list_notes():
    """Returns a list of all notes with search, tag filtering, and sorting."""
    search = request.args.get("search", "").strip() or None
    tag = request.args.get("tag", "").strip() or None
    fav_param = request.args.get("favorite", "").lower()
    favorite_only = fav_param in ("true", "1", "yes")
    sort_by = request.args.get("sort_by", "created_at")
    order = request.args.get("order", "desc")

    notes = get_all_notes(
        search=search,
        tag=tag,
        favorite_only=favorite_only,
        sort_by=sort_by,
        order=order
    )
    return jsonify({"notes": notes, "count": len(notes)}), 200

@notes_bp.route("/api/notes/<int:note_id>", methods=["GET"])
def get_single_note(note_id):
    """Returns details of a specific note."""
    note = get_note_by_id(note_id)
    if not note:
        return jsonify({"error": "Note not found."}), 404
    return jsonify({"note": note}), 200

@notes_bp.route("/api/notes", methods=["POST"])
def create_new_note():
    """Creates a single new note."""
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()

    if not title:
        return jsonify({"error": "Note title is required."}), 400

    extracted_text = data.get("extracted_text")
    image_filename = data.get("image_filename")
    image_path = data.get("image_path")
    image_metadata = data.get("image_metadata")
    ai_insights = data.get("ai_insights")
    source_image_filename = data.get("source_image_filename") or image_filename
    segment_index = data.get("segment_index", 0)
    tags = data.get("tags") or []
    is_favorite = bool(data.get("is_favorite", False))

    new_note = create_note(
        title=title,
        content=content,
        extracted_text=extracted_text,
        image_filename=image_filename,
        image_path=image_path,
        image_metadata=image_metadata,
        ai_insights=ai_insights,
        source_image_filename=source_image_filename,
        segment_index=segment_index,
        tags=tags,
        is_favorite=is_favorite
    )

    return jsonify({
        "message": "Note created successfully.",
        "note": new_note
    }), 201

@notes_bp.route("/api/notes/batch", methods=["POST"])
def create_batch_notes():
    """Creates multiple notes in a single batch operation."""
    data = request.get_json() or {}
    raw_notes = data.get("notes")

    if not raw_notes or not isinstance(raw_notes, list):
        return jsonify({"error": "Expected a JSON object with a 'notes' array."}), 400

    if len(raw_notes) == 0:
        return jsonify({"error": "The 'notes' array cannot be empty."}), 400

    notes_to_insert = []
    for item in raw_notes:
        title = (item.get("title") or "").strip()
        if not title:
            title = "Untitled Note"

        notes_to_insert.append({
            "title": title,
            "content": (item.get("content") or "").strip(),
            "extracted_text": item.get("extracted_text") or item.get("content", ""),
            "image_filename": item.get("image_filename"),
            "image_path": item.get("image_path"),
            "image_metadata": item.get("image_metadata"),
            "ai_insights": item.get("ai_insights"),
            "source_image_filename": item.get("source_image_filename") or item.get("image_filename"),
            "segment_index": item.get("segment_index", 0),
            "tags": item.get("tags") or ["notes"],
            "is_favorite": bool(item.get("is_favorite", False))
        })

    created_notes = batch_create_notes(notes_to_insert)

    return jsonify({
        "message": f"Successfully created {len(created_notes)} note(s).",
        "notes": created_notes,
        "count": len(created_notes)
    }), 201

@notes_bp.route("/api/notes/<int:note_id>", methods=["PUT"])
def modify_note(note_id):
    """Updates an existing note's metadata or text content."""
    note = get_note_by_id(note_id)
    if not note:
        return jsonify({"error": "Note not found."}), 404

    data = request.get_json() or {}

    title = data.get("title")
    if title is not None:
        title = title.strip()
        if not title:
            return jsonify({"error": "Note title cannot be empty."}), 400

    content = data.get("content")
    tags = data.get("tags")
    is_favorite = data.get("is_favorite")
    ai_insights = data.get("ai_insights")

    updated = update_note(
        note_id=note_id,
        title=title,
        content=content,
        tags=tags,
        is_favorite=is_favorite,
        ai_insights=ai_insights
    )

    return jsonify({
        "message": "Note updated successfully.",
        "note": updated
    }), 200

@notes_bp.route("/api/notes/<int:note_id>/enhance-ai", methods=["POST"])
def trigger_ai_enhancement(note_id):
    """Generates zero-cost minimal AI insights for an existing note."""
    note = get_note_by_id(note_id)
    if not note:
        return jsonify({"error": "Note not found."}), 404

    metadata = note.get("image_metadata") or {}
    text_source = note.get("extracted_text") or note.get("content") or ""
    insights = generate_minimal_ai_enhancements(
        text_source,
        note.get("title") or "Note",
        metadata
    )

    updated = update_note(
        note_id=note_id,
        ai_insights=insights
    )

    return jsonify({
        "message": "AI insights generated.",
        "ai_insights": insights,
        "note": updated
    }), 200

@notes_bp.route("/api/notes/<int:note_id>", methods=["DELETE"])
def remove_note(note_id):
    """Deletes a note and removes any associated image files from disk."""
    deleted_note = delete_note(note_id)
    if not deleted_note:
        return jsonify({"error": "Note not found."}), 404

    upload_folder = current_app.config.get("UPLOAD_FOLDER")
    if upload_folder:
        fn = deleted_note.get("image_filename")
        if fn:
            file_on_disk = os.path.join(upload_folder, fn)
            if os.path.exists(file_on_disk):
                try:
                    os.remove(file_on_disk)
                except Exception as e:
                    current_app.logger.warning(f"Could not delete file {file_on_disk}: {e}")

    return jsonify({
        "message": "Note deleted successfully.",
        "id": note_id
    }), 200

@notes_bp.route("/api/upload", methods=["POST"])
def upload_image_and_process():
    """
    Handles image uploads, transcribes plain text (Gemini Interactions API or local),
    and segments into plain-text note drafts.
    """
    if "file" not in request.files:
        return jsonify({"error": "No image file part provided."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    api_key = (request.headers.get("X-Gemini-Key") or request.form.get("gemini_api_key") or "").strip()
    
    print(f"[Upload] Received file: {file.filename}, API key present: {bool(api_key)}")

    try:
        processed = process_and_save_image(file, upload_folder, api_key=api_key)
    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 400
    except Exception as exc:
        print(f"[Upload] Error: {exc}")
        return jsonify({"error": f"Failed to process image: {str(exc)}"}), 500

    auto_save = request.form.get("auto_save", "").lower() in ("true", "1", "yes")

    draft_data = {
        "title": processed["suggested_title"],
        "content": processed["suggested_content"],
        "extracted_text": processed["extracted_text"],
        "image_filename": processed["filename"],
        "image_url": f"/api/uploads/{processed['filename']}",
        "image_metadata": processed["metadata"],
        "ai_insights": processed["ai_insights"],
        "tags": processed["suggested_tags"],
        "segmented_notes": processed["segmented_notes"],
        "is_favorite": False
    }

    if auto_save:
        notes_to_insert = []
        if processed.get("segmented_notes") and len(processed["segmented_notes"]) > 1:
            for s in processed["segmented_notes"]:
                notes_to_insert.append({
                    "title": s["title"],
                    "content": s["content"],
                    "extracted_text": s.get("extracted_text", s.get("content", "")),
                    "image_filename": processed["filename"],
                    "image_path": f"/api/uploads/{processed['filename']}",
                    "image_metadata": processed["metadata"],
                    "ai_insights": processed["ai_insights"],
                    "tags": s.get("tags", ["notes"]),
                    "source_image_filename": processed["filename"],
                    "segment_index": s.get("segment_index", 0),
                    "is_favorite": False
                })
        else:
            notes_to_insert.append({
                "title": processed["suggested_title"],
                "content": processed["suggested_content"],
                "extracted_text": processed["extracted_text"],
                "image_filename": processed["filename"],
                "image_path": f"/api/uploads/{processed['filename']}",
                "image_metadata": processed["metadata"],
                "ai_insights": processed["ai_insights"],
                "tags": processed["suggested_tags"],
                "source_image_filename": processed["filename"],
                "segment_index": 0,
                "is_favorite": False
            })

        created = batch_create_notes(notes_to_insert)
        return jsonify({
            "message": f"Successfully created {len(created)} note(s) from image.",
            "notes": created,
            "count": len(created)
        }), 201

    return jsonify({
        "message": "Image processed and transcribed.",
        "draft": draft_data
    }), 200

@notes_bp.route("/api/stats", methods=["GET"])
def get_note_statistics():
    """Returns database summary stats and storage metrics."""
    stats = get_stats(current_app.config["UPLOAD_FOLDER"])
    return jsonify({"stats": stats}), 200

# =========================================================================
# GLOBAL WORKSPACE FEDERATED RAG & MULTI-DOCUMENT CHAT ENDPOINTS
# =========================================================================

@notes_bp.route("/api/workspace/chat", methods=["POST"])
def workspace_global_chat():
    """
    Executes a Global Grounded RAG Query across all notebooks and notes in the workspace.
    Returns synthesized answer with multi-document cross-citations.
    """
    from backend.services.rag_service import query_workspace_rag
    from backend.db import (
        get_all_workspace_knowledge,
        get_workspace_chat_messages,
        save_workspace_chat_message
    )

    data = request.get_json() or {}
    user_query = (data.get("message") or "").strip()
    if not user_query:
        return jsonify({"error": "Message is required."}), 400

    api_key = (request.headers.get("X-Gemini-Key") or request.form.get("gemini_api_key") or data.get("gemini_api_key") or "").strip()

    # 1. Fetch entire workspace knowledge base
    workspace_data = get_all_workspace_knowledge()
    history = get_workspace_chat_messages()

    # 2. Save user message to DB
    user_msg = save_workspace_chat_message(
        role="user",
        content=user_query
    )

    # 3. Execute global workspace RAG query
    rag_result = query_workspace_rag(
        workspace_data=workspace_data,
        user_query=user_query,
        chat_history=history,
        api_key=api_key
    )

    # 4. Save assistant reply with citations
    assistant_msg = save_workspace_chat_message(
        role="assistant",
        content=rag_result["reply"],
        citations=rag_result.get("citations", []),
        model_used=rag_result.get("model", "gemini-3.6-flash")
    )

    return jsonify({
        "reply": rag_result["reply"],
        "citations": rag_result.get("citations", []),
        "model": rag_result.get("model"),
        "source": rag_result.get("source"),
        "user_message": user_msg,
        "assistant_message": assistant_msg
    }), 200

@notes_bp.route("/api/workspace/chat", methods=["GET"])
def get_workspace_chat_history():
    """Retrieves full global workspace conversation history."""
    from backend.db import get_workspace_chat_messages
    messages = get_workspace_chat_messages()
    return jsonify({"messages": messages, "count": len(messages)}), 200

@notes_bp.route("/api/workspace/chat", methods=["DELETE"])
def clear_workspace_chat():
    """Clears global workspace conversation history."""
    from backend.db import clear_workspace_chat_messages
    clear_workspace_chat_messages()
    return jsonify({"message": "Workspace chat history cleared."}), 200

