# NoteExtract AI — Multi-Modal Document Intelligence & Grounded RAG Platform

A full-stack, cross-platform AI application built with **Python (Flask)**, **SQLite**, and **React (Vite)** that transcribes handwritten notes and multi-page scanned PDFs into clean digital notebooks and provides **Grounded RAG (Retrieval-Augmented Generation) Document Q&A** with exact page-level citations using **Google Gemini 3.6 Flash Multi-Modal Interactions API** with local PyTorch fallback.

---

## 🌟 Key Features

- **🧠 Grounded RAG "Chat with your Notebook"**: Ask questions across 20+ handwritten pages. The AI answers with **clickable page citations (`[Page 2]`)** that jump directly to that page in the reader.
- **📖 Multi-Page Notebooks**: Create structured digital notebooks from multi-image batches or scanned PDF files.
- **📄 Printable PDF & Markdown Export**: 1-click generation of formatted PDF documents with dynamic Table of Contents and individual page styling using ReportLab.
- **👁️ 3-Way Layout Switcher ("Unsee" / Focus Mode)**: 
  - `[ 📝 Notes Only ]`: 100% full-width, distraction-free writing/reading (hides original photo).
  - `[ 📖 Split View ]`: 50/50 side-by-side verification (transcribed notes + untouched original photo).
  - `[ 🖼️ Photo Only ]`: Full-screen image zoom for inspecting complex diagrams and sketches.
- **⚡ Accurate Handwriting Transcription**: Powered by Google Gemini 3.6 Flash via the GenAI Interactions API (`Api-Revision: 2026-05-20`).
- **🗄️ SQLite Database Persistence**: Full relational schema with foreign keys, indexes, full-text search, and persistent conversation history.
- **🛡️ 100% Secure Client-Side Key Storage**: Free Gemini API keys are stored solely in the user's browser `localStorage` and never logged or committed to Git.

---

## 🚀 Quick Start (Single Universal Command)

To start the entire application (both Flask backend and React frontend):

```bash
python run.py
```
*(Or `py run.py` on Windows)*

- **Frontend Application**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **Backend REST API**: [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health)

---

## 🧪 Automated Testing

Run the automated test suite covering Single Notes, Notebooks, Grounded RAG, PDF Export, and Markdown Export:
```bash
python -m unittest discover -s backend/tests
```

---

## 📂 Project Architecture

```
├── backend/
│   ├── app.py                     # Flask application factory & blueprint registry
│   ├── db.py                      # SQLite schema, migrations & CRUD (Notes, Notebooks, Chat History)
│   ├── routes/
│   │   ├── notes.py               # Single notes REST endpoints & key verification
│   │   └── notebooks.py           # Multi-page notebook CRUD, batch upload, PDF export & RAG Chat
│   ├── services/
│   │   ├── ocr_service.py         # Gemini 3.6 Flash Interactions API + Local PyTorch fallback
│   │   ├── rag_service.py         # Grounded RAG reasoning, prompt chunking & citation extraction
│   │   ├── pdf_service.py         # ReportLab PDF generator & PDF page splitting
│   │   └── image_processor.py     # Image preprocessing & validation
│   └── tests/                     # Automated unit and integration test suite
├── frontend/
│   ├── src/
│   │   ├── components/            # React UI (Reader, ChatDrawer, BatchUploader, Cards, Modals)
│   │   └── services/api.js        # Frontend API client
│   └── index.html
├── docker-compose.yml             # Containerized multi-service orchestration
├── run.py                         # Single standard entrypoint launcher
└── README.md
```
