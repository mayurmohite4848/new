# NoteExtract AI — Clean White Canvas, PyTorch OCR & Multi-Note Studio

A full-stack application built with **Flask** (Python backend), **SQLite** (relational database), and **React** (Vite frontend) powered by **PyTorch & Hugging Face EasyOCR** that **removes image backgrounds onto a pure white canvas**, **identifies handwritten text**, **splits topics into distinct notes via an interactive 'Review & Split' workflow**, and renders notes in **natural, non-computerized handwriting**.

---

## 🌟 Key Features

### 1. 🔍 PyTorch & Hugging Face Handwriting Recognition (Zero-Cost & Local)
- Uses local PyTorch deep learning OCR (`easyocr` with CRAFT detector) to transcribe handwriting, diagrams, equations, and printed text from cleaned white-canvas scans.
- Operates 100% locally with zero external API fees or cloud subscriptions.

### 2. 🧩 Multi-Note 'Review & Split' Workflow
- Automatically detects topic shifts, headings (`#`, `:`), numbered sections, and bullet clusters in a single image.
- Presents an interactive **Review & Split Screen**:
  - View the clean white canvas image on the left.
  - Review and edit detected note drafts on the right.
  - Customize titles, content, tags, and handwriting fonts per note.
  - Single-click **"Save All Notes to SQLite"** batch creation.

### 3. ⚪ Background Removal to Pure White Canvas
- Automatically cleans photographed papers, whiteboard snapshots, and document scans.
- Strips shadows, yellow paper tints, room glare, and wrinkles using adaptive background illumination normalization.
- Renders extracted ink and drawings with high contrast on a crisp `#ffffff` canvas.

### 4. ✍️ Natural Handwriting Typography (Non-Computerized)
- Transcribes and renders note text using authentic, organic Google handwriting fonts:
  - **Caveat**: Natural pen flow with human baseline variation.
  - **Kalam**: Clean, ink-stroke handwritten script.
  - **Architects Daughter**: Architectural sketch and diagram annotation style.
  - **Patrick Hand**: Casual, human handwriting.
- Provides interactive paper canvases (Pure White, Ruled Notebook Lines, Dot Grid).

### 5. 🤖 Zero-Cost Minimal AI Assistant
- Strictly **minimal** additions (never overwhelms your notes).
- Generates 1–3 concise key takeaways and a conceptual flow card.

### 6. 🗄️ SQLite Database Persistence
- Stores notes, original uploads, clean white-canvas images, JSON technical metadata, AI insights, handwriting styles, and tags in [`notes.db`](file:///c:/Users/mayur/OneDrive/Desktop/ai/new/backend/notes.db).

---

## 📁 Project Structure

```
new/
├── backend/
│   ├── app.py                      # Flask app factory, static uploads & CORS
│   ├── db.py                       # SQLite database layer with batch insert & query filters
│   ├── init_db.py                  # Database table init & sample seeder
│   ├── requirements.txt            # Python dependencies (Flask, PyTorch, EasyOCR, Pillow)
│   ├── notes.db                    # SQLite database file
│   ├── uploads/                    # Directory for original and clean white images
│   ├── services/
│   │   ├── ocr_service.py          # PyTorch EasyOCR extractor & topic segmenter
│   │   └── image_processor.py      # Background stripper & zero-cost AI engine
│   ├── routes/
│   │   └── notes.py                # REST API endpoints (/api/notes, /api/notes/batch, /api/upload)
│   └── tests/
│       └── test_api.py             # Automated unit test suite (6 passing tests)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Header with health status & actions
│   │   │   ├── StatsBar.jsx        # Metrics & tag filter chips
│   │   │   ├── WhiteboardNoteCanvas.jsx # White canvas & natural handwriting sheet
│   │   │   ├── MultiNoteSplitReview.jsx # Interactive 'Review & Split' preview screen
│   │   │   ├── ImageUploader.jsx   # Drag-and-drop uploader & split workflow trigger
│   │   │   ├── NoteCard.jsx        # Glass card with clean white thumbnail & handwriting
│   │   │   ├── NoteModal.jsx       # Tabbed modal (Sheet, Cleaned Ink, AI, Original, Meta)
│   │   │   ├── ManualNoteModal.jsx # Quick text note creator modal
│   │   │   └── Toast.jsx           # Interactive alerts
│   │   ├── services/
│   │   │   └── api.js              # Fetch client for Flask backend
│   │   ├── App.jsx                 # Main dashboard
│   │   └── index.css               # White canvas, handwriting typography, and dark UI
│   ├── package.json
│   └── vite.config.js              # Vite configuration with API proxy
├── run.py                          # Unified launcher for Backend & Frontend
└── README.md
```

---

## 🚀 Getting Started

### 1. Quick Start (All-in-One)
```powershell
# Using Python launcher on Windows:
py run.py

# Or using the local virtual environment directly:
.\venv\Scripts\python.exe run.py
```
- **Frontend Dashboard**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **Backend API**: [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health)

---

### 2. Manual Start (Separate Terminals)

#### Backend (Flask)
```powershell
.\venv\Scripts\activate
python backend/app.py
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
| `GET` | `/api/notes/<id>` | Get single note detail |
| `POST` | `/api/notes` | Create a single note |
| `POST` | `/api/notes/batch` | Batch insert multiple notes from Review & Split workflow |
| `PUT` | `/api/notes/<id>` | Update note fields (content, style, tags, favorite) |
| `DELETE` | `/api/notes/<id>` | Delete note and remove associated image files |
| `POST` | `/api/upload` | Upload image, strip background to white canvas, run PyTorch OCR, and segment notes |
| `POST` | `/api/notes/<id>/enhance-ai` | Re-generate zero-cost minimal AI insights for a note |
| `GET` | `/api/uploads/<filename>` | Serve raw or cleaned white-canvas images |
| `GET` | `/api/stats` | Overview counts (total notes, images, favorites, tags) |

---

## 🧪 Running Automated Tests

```powershell
.\venv\Scripts\python.exe -m unittest discover -s backend/tests
```
All 6 unit tests verify CRUD operations, background binarization onto white canvas, PyTorch OCR handwriting identification, multi-topic segmentation, and batch creation.
