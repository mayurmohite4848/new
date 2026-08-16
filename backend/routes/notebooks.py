import os
import io
import time
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, current_app, send_file, Response
from backend.db import (
    create_notebook,
    get_all_notebooks,
    get_notebook_by_id,
    update_notebook,
    delete_notebook,
    add_notebook_page,
    update_notebook_page,
    delete_notebook_page,
    reorder_notebook_pages
)
from backend.services.image_processor import process_and_save_image, allowed_file
from backend.services.ocr_service import extract_handwriting_text
from backend.services.pdf_service import generate_notebook_pdf, generate_notebook_markdown, split_pdf_to_images

notebooks_bp = Blueprint("notebooks_bp", __name__)

@notebooks_bp.route("/api/notebooks", methods=["GET"])
def list_notebooks():
    """Returns a list of all notebooks with page counts and metadata."""
    search = request.args.get("search", "").strip() or None
    subject = request.args.get("subject", "").strip() or None
    notebooks = get_all_notebooks(search=search, subject=subject)
    return jsonify({"notebooks": notebooks, "count": len(notebooks)}), 200

@notebooks_bp.route("/api/notebooks", methods=["POST"])
def create_new_notebook():
    """Creates a new empty notebook container."""
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Notebook title is required."}), 400

    description = data.get("description", "")
    subject_tag = data.get("subject_tag", "General")
    cover_color = data.get("cover_color", "#6366f1")

    notebook = create_notebook(
        title=title,
        description=description,
        subject_tag=subject_tag,
        cover_color=cover_color
    )
    return jsonify({"message": "Notebook created successfully.", "notebook": notebook}), 201

@notebooks_bp.route("/api/notebooks/<int:notebook_id>", methods=["GET"])
def get_single_notebook(notebook_id):
    """Returns details of a specific notebook including all ordered pages."""
    notebook = get_notebook_by_id(notebook_id, include_pages=True)
    if not notebook:
        return jsonify({"error": "Notebook not found."}), 404
    return jsonify({"notebook": notebook}), 200

@notebooks_bp.route("/api/notebooks/<int:notebook_id>", methods=["PUT"])
def modify_notebook(notebook_id):
    """Updates notebook title, description, subject, or cover color."""
    data = request.get_json() or {}
    updated = update_notebook(
        notebook_id=notebook_id,
        title=data.get("title"),
        description=data.get("description"),
        subject_tag=data.get("subject_tag"),
        cover_color=data.get("cover_color"),
        is_favorite=data.get("is_favorite")
    )
    if not updated:
        return jsonify({"error": "Notebook not found."}), 404
    return jsonify({"message": "Notebook updated.", "notebook": updated}), 200

@notebooks_bp.route("/api/notebooks/<int:notebook_id>", methods=["DELETE"])
def remove_notebook(notebook_id):
    """Deletes a notebook and all associated pages."""
    deleted = delete_notebook(notebook_id)
    if not deleted:
        return jsonify({"error": "Notebook not found."}), 404
    return jsonify({"message": "Notebook deleted.", "id": notebook_id}), 200

@notebooks_bp.route("/api/notebooks/upload-batch", methods=["POST"])
def upload_notebook_batch():
    """
    Accepts multiple uploaded images or a single multi-page PDF,
    transcribes each page with Gemini Interactions API,
    and creates a complete multi-page Notebook in SQLite.
    """
    files = request.files.getlist("files") or request.files.getlist("file")
    if not files or len(files) == 0 or files[0].filename == '':
        return jsonify({"error": "No image or PDF files provided."}), 400

    title = request.form.get("title", "").strip()
    if not title:
        first_clean = os.path.splitext(files[0].filename)[0].replace('_', ' ').replace('-', ' ').title()
        title = f"{first_clean} Notebook"

    description = request.form.get("description", "").strip()
    subject_tag = request.form.get("subject_tag", "General").strip()
    cover_color = request.form.get("cover_color", "#6366f1")
    api_key = (request.headers.get("X-Gemini-Key") or request.form.get("gemini_api_key") or "").strip()

    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    # 1. Create the notebook container
    notebook = create_notebook(
        title=title,
        description=description,
        subject_tag=subject_tag,
        cover_color=cover_color
    )
    notebook_id = notebook["id"]

    processed_pages = []
    
    # Check if a single PDF was uploaded
    first_file = files[0]
    if len(files) == 1 and first_file.filename.lower().endswith('.pdf'):
        pdf_path = os.path.join(upload_folder, secure_filename(first_file.filename))
        first_file.save(pdf_path)
        page_image_paths = split_pdf_to_images(pdf_path, upload_folder)
        
        for idx, img_path in enumerate(page_image_paths):
            p_num = idx + 1
            print(f"[Notebook Batch] Transcribing PDF page {p_num}/{len(page_image_paths)}...")
            transcribed_text = extract_handwriting_text(img_path, api_key=api_key)
            
            lines = [l.strip() for l in (transcribed_text or "").split('\n') if l.strip()]
            p_title = lines[0].lstrip('#-• ').strip() if lines else f"Page {p_num}"
            if len(p_title) > 40:
                p_title = p_title[:37] + "..."

            page = add_notebook_page(
                notebook_id=notebook_id,
                page_number=p_num,
                title=p_title or f"Page {p_num}",
                content=transcribed_text or f"Page {p_num} notes.",
                extracted_text=transcribed_text,
                image_filename=os.path.basename(img_path),
                image_path=f"/api/uploads/{os.path.basename(img_path)}"
            )
            processed_pages.append(page)
            time.sleep(0.3)
    else:
        # Multi-image uploads
        for idx, f in enumerate(files):
            if not f or not f.filename or not allowed_file(f.filename):
                continue
            
            p_num = idx + 1
            print(f"[Notebook Batch] Processing image {p_num}/{len(files)}: {f.filename}...")
            
            processed = process_and_save_image(f, upload_folder, api_key=api_key)
            transcribed_text = processed.get("extracted_text", "")
            
            lines = [l.strip() for l in (transcribed_text or "").split('\n') if l.strip()]
            p_title = lines[0].lstrip('#-• ').strip() if lines else f"Page {p_num}"
            if len(p_title) > 40:
                p_title = p_title[:37] + "..."

            page = add_notebook_page(
                notebook_id=notebook_id,
                page_number=p_num,
                title=p_title or f"Page {p_num}",
                content=transcribed_text or f"Notes digitized from {f.filename}.",
                extracted_text=transcribed_text,
                image_filename=processed["filename"],
                image_path=f"/api/uploads/{processed['filename']}",
                image_metadata=processed.get("metadata"),
                ai_summary=processed.get("ai_insights")
            )
            processed_pages.append(page)
            time.sleep(0.3)

    full_notebook = get_notebook_by_id(notebook_id, include_pages=True)
    return jsonify({
        "message": f"Successfully created notebook with {len(processed_pages)} page(s)!",
        "notebook": full_notebook
    }), 201

@notebooks_bp.route("/api/notebooks/<int:notebook_id>/pages", methods=["POST"])
def add_page(notebook_id):
    """
    Adds one or more handwritten photos/PDF pages to an existing notebook.
    Supports single file, multiple files (files), or a scanned PDF.
    """
    nb = get_notebook_by_id(notebook_id, include_pages=False)
    if not nb:
        return jsonify({"error": "Notebook not found."}), 404

    api_key = (request.headers.get("X-Gemini-Key") or request.form.get("gemini_api_key") or "").strip()
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    os.makedirs(upload_folder, exist_ok=True)

    files = request.files.getlist("files") or request.files.getlist("file")
    added_pages = []

    if files and len(files) > 0 and files[0].filename:
        # Check if single PDF
        if len(files) == 1 and files[0].filename.lower().endswith('.pdf'):
            pdf_path = os.path.join(upload_folder, secure_filename(files[0].filename))
            files[0].save(pdf_path)
            page_image_paths = split_pdf_to_images(pdf_path, upload_folder)
            for idx, img_path in enumerate(page_image_paths):
                transcribed_text = extract_handwriting_text(img_path, api_key=api_key)
                lines = [l.strip() for l in (transcribed_text or "").split('\n') if l.strip()]
                p_title = lines[0].lstrip('#-• ').strip() if lines else f"New Page"
                if len(p_title) > 40:
                    p_title = p_title[:37] + "..."

                page = add_notebook_page(
                    notebook_id=notebook_id,
                    title=p_title,
                    content=transcribed_text or "New page notes.",
                    extracted_text=transcribed_text,
                    image_filename=os.path.basename(img_path),
                    image_path=f"/api/uploads/{os.path.basename(img_path)}"
                )
                added_pages.append(page)
                time.sleep(0.3)
        else:
            # Multi or single image files
            for f in files:
                if not f or not f.filename or not allowed_file(f.filename):
                    continue
                processed = process_and_save_image(f, upload_folder, api_key=api_key)
                transcribed_text = processed.get("extracted_text", "")
                lines = [l.strip() for l in (transcribed_text or "").split('\n') if l.strip()]
                p_title = lines[0].lstrip('#-• ').strip() if lines else f"New Page"
                if len(p_title) > 40:
                    p_title = p_title[:37] + "..."

                page = add_notebook_page(
                    notebook_id=notebook_id,
                    title=p_title,
                    content=transcribed_text or f"Notes digitized from {f.filename}.",
                    extracted_text=transcribed_text,
                    image_filename=processed["filename"],
                    image_path=f"/api/uploads/{processed['filename']}",
                    image_metadata=processed.get("metadata"),
                    ai_summary=processed.get("ai_insights")
                )
                added_pages.append(page)
                time.sleep(0.3)
    else:
        data = request.get_json() or {}
        page = add_notebook_page(
            notebook_id=notebook_id,
            title=data.get("title", "Untitled Page"),
            content=data.get("content", ""),
            extracted_text=data.get("extracted_text")
        )
        added_pages.append(page)

    full_nb = get_notebook_by_id(notebook_id, include_pages=True)
    return jsonify({
        "message": f"Successfully added {len(added_pages)} page(s) to notebook.",
        "pages": added_pages,
        "notebook": full_nb
    }), 201

@notebooks_bp.route("/api/notebooks/<int:notebook_id>/pages/<int:page_id>", methods=["PUT"])
def edit_page(notebook_id, page_id):
    """Updates a single page's text or title."""
    data = request.get_json() or {}
    updated = update_notebook_page(
        page_id=page_id,
        title=data.get("title"),
        content=data.get("content"),
        page_number=data.get("page_number")
    )
    if not updated:
        return jsonify({"error": "Page not found."}), 404
    return jsonify({"message": "Page updated.", "page": updated}), 200

@notebooks_bp.route("/api/notebooks/<int:notebook_id>/pages/<int:page_id>", methods=["DELETE"])
def remove_page(notebook_id, page_id):
    """Deletes a page from a notebook."""
    deleted = delete_notebook_page(page_id)
    if not deleted:
        return jsonify({"error": "Page not found."}), 404
    return jsonify({"message": "Page deleted.", "id": page_id}), 200

@notebooks_bp.route("/api/notebooks/<int:notebook_id>/reorder", methods=["POST"])
def reorder_pages(notebook_id):
    """Reorders pages in a notebook."""
    data = request.get_json() or {}
    page_ids = data.get("page_ids", [])
    if not page_ids:
        return jsonify({"error": "page_ids array required."}), 400

    updated_nb = reorder_notebook_pages(notebook_id, page_ids)
    return jsonify({"message": "Pages reordered.", "notebook": updated_nb}), 200

@notebooks_bp.route("/api/notebooks/<int:notebook_id>/export-pdf", methods=["GET"])
def export_pdf(notebook_id):
    """Builds and streams a clean printable PDF document for the notebook."""
    notebook = get_notebook_by_id(notebook_id, include_pages=True)
    if not notebook:
        return jsonify({"error": "Notebook not found."}), 404

    pdf_buffer = io.BytesIO()
    generate_notebook_pdf(notebook, pdf_buffer)
    pdf_buffer.seek(0)

    clean_filename = secure_filename(notebook.get("title", "notebook")).lower() or "notebook"
    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"{clean_filename}.pdf"
    )

@notebooks_bp.route("/api/notebooks/<int:notebook_id>/export-md", methods=["GET"])
def export_markdown(notebook_id):
    """Streams a consolidated Markdown bundle for the notebook."""
    notebook = get_notebook_by_id(notebook_id, include_pages=True)
    if not notebook:
        return jsonify({"error": "Notebook not found."}), 404

    md_content = generate_notebook_markdown(notebook)
    clean_filename = secure_filename(notebook.get("title", "notebook")).lower() or "notebook"

    return Response(
        md_content,
        mimetype="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={clean_filename}.md"}
    )
