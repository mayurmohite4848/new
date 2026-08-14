# NoteExtract AI — Image Note Extractor & SQLite Hub

A full-stack application built with **Flask** (Python backend), **SQLite** (relational database), and **React** (Vite frontend) for uploading images, extracting image metadata and notes, and managing knowledge cards with search, tag filtering, and favorites.

---

## 🌟 Key Features

- **Flask 3.x Backend**:
  - RESTful API with Flask Blueprints and CORS configuration.
  - SQLite database persistence with JSON metadata columns, indexed search, and relation tracking.
  - Image processing service powered by Pillow (extracts dimensions, aspect ratio, color mode, format, file size, EXIF data, and text suggestions).
  - Extensible OCR / text extraction engine.
- **Modern React Frontend**:
  - Curated Glassmorphism dark-slate theme with glowing accents and smooth micro-animations.
  - **Drag-and-Drop Image Uploader**: Real-time dropzone with instant client preview and metadata extraction inspector.
  - **Live Note Management**: Grid view & list view, real-time search, tag cloud filters, and star favorites.
  - **High-Res Note Modal**: Side-by-side technical metadata inspector, full image lightbox, copy extracted text to clipboard, and note editing.
  - **Manual Note Creation**: Quick add note modal for text-only thoughts and insights.
  - **Live Metrics Dashboard**: Real-time counts of total notes, images processed, favorites, and indexed tags.

---

## 📁 Project Structure

```
new/
├── backend/
│   ├── app.py                      # Flask app factory, static uploads & CORS
│   ├── db.py                       # SQLite database layer & CRUD queries
│   ├── init_db.py                  # Database table init & sample seeder
│   ├── requirements.txt            # Python dependencies (Flask, Pillow, Flask-CORS)
│   ├── notes.db                    # SQLite database file
│   ├── uploads/                    # Directory for uploaded image files
│   ├── services/
│   │   └── image_processor.py      # Pillow metadata extractor & note parser
│   ├── routes/
│   │   └── notes.py                # REST API endpoints (/api/notes, /api/upload, etc.)
│   └── tests/
│       └── test_api.py             # Automated unittest suite
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Header with health status & quick actions
│   │   │   ├── StatsBar.jsx        # Metric cards & clickable tag filter chips
│   │   │   ├── ImageUploader.jsx   # Drag-and-drop uploader & extraction draft
│   │   │   ├── NoteCard.jsx        # Glass card with image thumbnail & tags
│   │   │   ├── NoteModal.jsx       # Full note detail & metadata inspector
│   │   │   ├── ManualNoteModal.jsx # Quick text note creator modal
│   │   │   └── Toast.jsx           # Interactive feedback notifications
│   │   ├── services/
│   │   │   └── api.js              # Fetch client for Flask backend endpoints
│   │   ├── App.jsx                 # Main dashboard component
│   │   └── index.css               # Design tokens & glassmorphism styles
│   ├── package.json
│   └── vite.config.js              # Vite configuration with API proxy
├── run.py                          # Unified launcher for Backend & Frontend
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Quick Start (All-in-One)
Run the root launcher script using either `py` or the virtual environment:
```powershell
# Using the Python launcher (recommended for Windows):
py run.py

# Or using the local virtual environment directly:
.\venv\Scripts\python.exe run.py
```
Then visit:
- **Frontend Dashboard**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **Backend API**: [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health)

---

### 3. Manual Start (Separate Terminals)

#### Backend (Flask)
```powershell
# Option A: Activate virtual environment first
.\venv\Scripts\activate
python backend/app.py

# Option B: Run directly with venv python
.\venv\Scripts\python.exe backend/app.py

# Option C: Run with Windows Python launcher
py backend/app.py
```
Backend runs on `http://127.0.0.1:5000`.

#### Frontend (React)
```powershell
cd frontend
npm run dev
```
Frontend runs on `http://127.0.0.1:5173`.


---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & service status |
| `GET` | `/api/notes` | List notes (Supports `?search=`, `?tag=`, `?favorite=true`, `?sort_by=`, `?order=`) |
| `GET` | `/api/notes/<id>` | Get single note by ID |
| `POST` | `/api/notes` | Create a new note |
| `PUT` | `/api/notes/<id>` | Update note content, title, tags, or favorite flag |
| `DELETE` | `/api/notes/<id>` | Delete note and cleanup associated image |
| `POST` | `/api/upload` | Upload image (`multipart/form-data`) and extract metadata / notes |
| `GET` | `/api/uploads/<filename>` | Serve uploaded image |
| `GET` | `/api/stats` | Get overview counts (total notes, images, favorites, tags) |

---

## 🧪 Running Automated Tests

Run the backend test suite:
```bash
.\venv\Scripts\python.exe -m unittest discover -s backend/tests
```
All unit tests verify CRUD operations, SQLite persistence, image metadata parsing, search filters, and error handlers.
