import os
import sys

# Ensure parent directory is in sys.path when running app directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from backend.db import init_db
from backend.routes.notes import notes_bp

def create_app(test_config=None):
    """Application factory for the Flask backend."""
    app = Flask(__name__)

    # Base directory paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    upload_dir = os.path.join(base_dir, "uploads")
    db_path = os.path.join(base_dir, "notes.db")

    os.makedirs(upload_dir, exist_ok=True)

    # Configuration
    app.config["UPLOAD_FOLDER"] = upload_dir
    app.config["DATABASE_PATH"] = db_path
    app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 32 MB max upload

    if test_config:
        app.config.update(test_config)

    # Initialize Database
    init_db(app.config["DATABASE_PATH"])

    # Enable CORS for all routes (allows React frontend on any local port)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register Blueprints
    app.register_blueprint(notes_bp)

    # Serve uploaded images
    @app.route("/api/uploads/<path:filename>", methods=["GET"])
    def serve_upload(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # Health check endpoint
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "Flask Notes & Image Extraction API",
            "version": "1.0.0"
        }), 200

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint or resource not found."}), 404

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return jsonify({"error": "File size exceeds the 32MB maximum limit."}), 413

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error."}), 500

    return app

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Flask backend running on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
