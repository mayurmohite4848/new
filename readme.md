# NoteExtract AI — Clean White Canvas & Natural Handwriting Hub

A full-stack application built with **Flask** (Python backend), **SQLite** (relational database), and **React** (Vite frontend) that **removes image backgrounds onto a pure white canvas**, **improves handwriting naturally** without robotic computerized fonts, and provides **zero-cost minimal AI support**.

---

## 🌟 Key Features

### 1. ⚪ Background Removal to Pure White Canvas
- Automatically cleans photographed papers, whiteboard snapshots, and document scans.
- Strips shadows, yellow paper tints, room glare, and wrinkles using adaptive background illumination normalization.
- Renders extracted ink and drawings with high contrast on a crisp `#ffffff` canvas.

### 2. ✍️ Natural Handwriting Engine (Non-Computerized)
- Transcribes and renders note text using authentic, organic Google handwriting fonts:
  - **Caveat**: Natural pen flow with human baseline variation.
  - **Kalam**: Clean, ink-stroke handwritten script.
  - **Architects Daughter**: Architectural sketch and diagram annotation style.
  - **Patrick Hand**: Casual, human handwriting.
- Provides interactive paper canvases (Pure White, Ruled Notebook Lines, Dot Grid).

### 3. 🤖 Zero-Cost Minimal AI Assistant (100% Free & Local)
- Strictly **minimal** additions (never overwhelms your notes).
- Generates 1–3 concise key takeaways and a conceptual flow card.
- Works 100% locally with zero external API fees or subscriptions.

### 4. 🗄️ SQLite Database Persistence
- Stores notes, original uploads, clean white-canvas images, JSON technical metadata, AI insights, handwriting styles, and tags in [`notes.db`](file:///c:/Users/mayur/OneDrive/Desktop/ai/new/backend/notes.db).

### 5. 🎛️ Interactive Dashboard & Inspector
- Real-time search across notes, titles, and extracted text.
- Interactive tag cloud filter chips.
- Favorites system with star toggles.
- Whiteboard Canvas modal with printing and PNG export.

---

## 📁 Project Structure

```
new/
├── backend/
│   ├── app.py                      # Flask app factory, static uploads & CORS
│   ├── db.py                       # SQLite database layer with migrations & queries
│   ├── init_db.py                  # Database table init & sample seeder
│   ├── requirements.txt            # Python dependencies (Flask, Pillow, NumPy, Flask-CORS)
│   ├── notes.db                    # SQLite database file
│   ├── uploads/                    # Directory for original and clean white images
│   ├── services/
│   │   └── image_processor.py      # Background stripper & zero-cost AI engine
│   ├── routes/
│   │   └── notes.py                # REST API endpoints (/api/notes, /api/upload, /api/enhance-ai)
│   └── tests/
│       └── test_api.py             # Automated unit test suite (6 passing tests)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Header with health status & actions
│   │   │   ├── StatsBar.jsx        # Metrics & tag filter chips
│   │   │   ├── WhiteboardNoteCanvas.jsx # White canvas & natural handwriting sheet
│   │   │   ├── ImageUploader.jsx   # Drag-and-drop uploader & clean canvas preview
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
| `POST` | `/api/notes` | Create a new note |
| `PUT` | `/api/notes/<id>` | Update note fields (content, style, tags, favorite) |
| `DELETE` | `/api/notes/<id>` | Delete note and remove associated image files |
| `POST` | `/api/upload` | Upload image, strip background to white canvas, and generate AI insights |
| `POST` | `/api/notes/<id>/enhance-ai` | Re-generate zero-cost minimal AI insights for a note |
| `GET` | `/api/uploads/<filename>` | Serve raw or cleaned white-canvas images |
| `GET` | `/api/stats` | Overview counts (total notes, images, favorites, tags) |

---

## 🧪 Running Automated Tests

```powershell
.\venv\Scripts\python.exe -m unittest discover -s backend/tests
```
All 6 unit tests verify CRUD operations, background binarization onto white canvas, minimal AI insights generation, and search filtering.
