import os
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

notes_bp = Blueprint("notes_bp", __name__)

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
    cleaned_image_filename = data.get("cleaned_image_filename")
    cleaned_image_path = data.get("cleaned_image_path")
    image_metadata = data.get("image_metadata")
    ai_insights = data.get("ai_insights")
    handwriting_style = data.get("handwriting_style") or "caveat"
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
        cleaned_image_filename=cleaned_image_filename,
        cleaned_image_path=cleaned_image_path,
        image_metadata=image_metadata,
        ai_insights=ai_insights,
        handwriting_style=handwriting_style,
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
def create_notes_batch():
    """Inserts multiple notes in a batch from the Review & Split workflow."""
    data = request.get_json() or {}
    notes_to_create = data.get("notes") or []

    if not notes_to_create or not isinstance(notes_to_create, list):
        return jsonify({"error": "No notes array provided for batch creation."}), 400

    created_notes = batch_create_notes(notes_to_create)

    return jsonify({
        "message": f"Successfully created {len(created_notes)} note(s) from image.",
        "count": len(created_notes),
        "notes": created_notes
    }), 201

@notes_bp.route("/api/notes/<int:note_id>", methods=["PUT"])
def update_existing_note(note_id):
    """Updates an existing note's fields."""
    note = get_note_by_id(note_id)
    if not note:
        return jsonify({"error": "Note not found."}), 404

    data = request.get_json() or {}
    title = data.get("title")
    content = data.get("content")
    extracted_text = data.get("extracted_text")
    cleaned_image_filename = data.get("cleaned_image_filename")
    cleaned_image_path = data.get("cleaned_image_path")
    ai_insights = data.get("ai_insights")
    handwriting_style = data.get("handwriting_style")
    tags = data.get("tags")
    is_favorite = data.get("is_favorite")

    updated = update_note(
        note_id=note_id,
        title=title,
        content=content,
        extracted_text=extracted_text,
        cleaned_image_filename=cleaned_image_filename,
        cleaned_image_path=cleaned_image_path,
        ai_insights=ai_insights,
        handwriting_style=handwriting_style,
        tags=tags,
        is_favorite=is_favorite
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
        "message": "Minimal AI insights generated.",
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
        for fn_key in ["image_filename", "cleaned_image_filename"]:
            fn = deleted_note.get(fn_key)
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
    Handles image uploads, runs PyTorch OCR, segments text into multi-note drafts,
    and returns full preview data for the Review & Split workflow.
    """
    if "file" not in request.files:
        return jsonify({"error": "No image file part provided."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    upload_folder = current_app.config["UPLOAD_FOLDER"]

    try:
        processed = process_and_save_image(file, upload_folder)
    except ValueError as val_err:
        return jsonify({"error": str(val_err)}), 400
    except Exception as exc:
        return jsonify({"error": f"Failed to process image: {str(exc)}"}), 500

    auto_save = request.form.get("auto_save", "").lower() in ("true", "1", "yes")

    draft_data = {
        "title": processed["suggested_title"],
        "content": processed["suggested_content"],
        "extracted_text": processed["extracted_text"],
        "image_filename": processed["filename"],
        "image_url": f"/api/uploads/{processed['filename']}",
        "cleaned_image_filename": processed["cleaned_filename"],
        "cleaned_image_url": f"/api/uploads/{processed['cleaned_filename']}",
        "image_metadata": processed["metadata"],
        "ai_insights": processed["ai_insights"],
        "handwriting_style": "caveat",
        "tags": processed["suggested_tags"],
        "segmented_notes": processed["segmented_notes"],
        "is_favorite": False
    }

    if auto_save:
        # If auto_save requested, insert segmented notes or single note
        notes_to_insert = []
        if processed.get("segmented_notes") and len(processed["segmented_notes"]) > 1:
            for s in processed["segmented_notes"]:
                notes_to_insert.append({
                    "title": s["title"],
                    "content": s["content"],
                    "extracted_text": s.get("extracted_text", ""),
                    "image_filename": processed["filename"],
                    "image_path": f"/api/uploads/{processed['filename']}",
                    "cleaned_image_filename": processed["cleaned_filename"],
                    "cleaned_image_path": f"/api/uploads/{processed['cleaned_filename']}",
                    "image_metadata": processed["metadata"],
                    "ai_insights": processed["ai_insights"],
                    "handwriting_style": s.get("handwriting_style", "caveat"),
                    "tags": s.get("tags", ["handwritten", "white-canvas"]),
                    "source_image_filename": processed["filename"],
                    "segment_index": s.get("segment_index", 0),
                    "is_favorite": False
                })
            saved_notes = batch_create_notes(notes_to_insert)
            return jsonify({
                "message": f"Created {len(saved_notes)} notes from image.",
                "draft": draft_data,
                "notes": saved_notes
            }), 201
        else:
            saved_note = create_note(
                title=draft_data["title"],
                content=draft_data["content"],
                extracted_text=draft_data["extracted_text"],
                image_filename=draft_data["image_filename"],
                image_path=draft_data["image_url"],
                cleaned_image_filename=draft_data["cleaned_image_filename"],
                cleaned_image_path=draft_data["cleaned_image_url"],
                image_metadata=draft_data["image_metadata"],
                ai_insights=draft_data["ai_insights"],
                handwriting_style="caveat",
                tags=draft_data["tags"],
                is_favorite=False
            )
            return jsonify({
                "message": "Note saved successfully.",
                "draft": draft_data,
                "note": saved_note
            }), 201

    return jsonify({
        "message": "Image analyzed, handwriting identified, and notes segmented.",
        "draft": draft_data
    }), 200

@notes_bp.route("/api/stats", methods=["GET"])
def fetch_stats():
    """Returns application note & storage statistics."""
    stats = get_stats()
    return jsonify({"stats": stats}), 200
