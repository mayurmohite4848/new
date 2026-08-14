import os
from flask import Blueprint, request, jsonify, current_app
from backend.db import (
    get_all_notes,
    get_note_by_id,
    create_note,
    update_note,
    delete_note,
    get_stats
)
from backend.services.image_processor import process_and_save_image

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
    """Creates a new note."""
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()

    if not title:
        return jsonify({"error": "Note title is required."}), 400

    extracted_text = data.get("extracted_text")
    image_filename = data.get("image_filename")
    image_path = data.get("image_path")
    image_metadata = data.get("image_metadata")
    tags = data.get("tags") or []
    is_favorite = bool(data.get("is_favorite", False))

    new_note = create_note(
        title=title,
        content=content,
        extracted_text=extracted_text,
        image_filename=image_filename,
        image_path=image_path,
        image_metadata=image_metadata,
        tags=tags,
        is_favorite=is_favorite
    )

    return jsonify({
        "message": "Note created successfully.",
        "note": new_note
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
    tags = data.get("tags")
    is_favorite = data.get("is_favorite")

    updated = update_note(
        note_id=note_id,
        title=title,
        content=content,
        extracted_text=extracted_text,
        tags=tags,
        is_favorite=is_favorite
    )

    return jsonify({
        "message": "Note updated successfully.",
        "note": updated
    }), 200

@notes_bp.route("/api/notes/<int:note_id>", methods=["DELETE"])
def remove_note(note_id):
    """Deletes a note and removes any associated image file from disk."""
    deleted_note = delete_note(note_id)
    if not deleted_note:
        return jsonify({"error": "Note not found."}), 404

    # Remove the uploaded file if present
    if deleted_note.get("image_filename"):
        upload_folder = current_app.config.get("UPLOAD_FOLDER")
        if upload_folder:
            file_on_disk = os.path.join(upload_folder, deleted_note["image_filename"])
            if os.path.exists(file_on_disk):
                try:
                    os.remove(file_on_disk)
                except Exception as e:
                    current_app.logger.warning(f"Could not delete image file {file_on_disk}: {e}")

    return jsonify({
        "message": "Note deleted successfully.",
        "id": note_id
    }), 200

@notes_bp.route("/api/upload", methods=["POST"])
def upload_image_and_process():
    """
    Handles image uploads, extracts metadata and note text,
    and returns the extraction draft (or auto-saves as a note if requested).
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
    custom_title = request.form.get("title", "").strip() or processed["suggested_title"]
    custom_content = request.form.get("content", "").strip() or processed["suggested_content"]

    draft_data = {
        "title": custom_title,
        "content": custom_content,
        "extracted_text": processed["extracted_text"],
        "image_filename": processed["filename"],
        "image_url": f"/api/uploads/{processed['filename']}",
        "image_metadata": processed["metadata"],
        "tags": processed["suggested_tags"],
        "is_favorite": False
    }

    if auto_save:
        saved_note = create_note(
            title=draft_data["title"],
            content=draft_data["content"],
            extracted_text=draft_data["extracted_text"],
            image_filename=draft_data["image_filename"],
            image_path=draft_data["image_url"],
            image_metadata=draft_data["image_metadata"],
            tags=draft_data["tags"],
            is_favorite=False
        )
        return jsonify({
            "message": "Image processed and note saved successfully.",
            "draft": draft_data,
            "note": saved_note
        }), 201

    return jsonify({
        "message": "Image processed and metadata extracted successfully.",
        "draft": draft_data
    }), 200

@notes_bp.route("/api/stats", methods=["GET"])
def fetch_stats():
    """Returns application note & storage statistics."""
    stats = get_stats()
    return jsonify({"stats": stats}), 200
