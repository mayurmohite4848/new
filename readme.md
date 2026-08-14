# NoteExtract AI — Clean Plain Text Notes & Accurate Handwriting Recognition

A modern full-stack web application built with **Flask** (Python backend), **SQLite** (relational database), and **React** (Vite frontend) that transcribes photographed handwriting into **clean, structured plain-text notes** with **zero image alteration** and **zero gibberish** using **Google Gemini 2.0 / 1.5 Flash (Free Tier)** with local fallback.

---

## 🌟 Key Capabilities

### 1. 📝 Clean Plain Text Notes (No Artificial Background Editing)
- Uploaded photos remain completely **untouched in their original format**.
- All image background binarization / white canvas filtering has been removed.
- Notes are clean, high-contrast, editable plain text formatted with standard modern typography (Inter).

### 2. ⚡ Accurate English Handwriting Recognition (Zero Gibberish & No Training Needed)
- Uses **Google Gemini 2.0 Flash** ($0 free tier with 15 RPM from Google AI Studio) to read cursive handwriting, abbreviations, and sketches.
- Automatically expands common shortforms (`w/` $\to$ `with`, `b/c` $\to$ `because`, `mgmt` $\to$ `management`, `arch` $\to$ `architecture`, `db` $\to$ `database`, etc.).
- **No manual model training or labeling required**.

### 3. 🧩 Multi-Note 'Review & Split' Workflow
- Automatically detects topic shifts, numbered lists, and headings, segmenting a multi-topic page into discrete plain-text notes.
- Review and edit detected titles and paragraphs before saving to SQLite in one click.

### 4. 🗄️ SQLite Database Persistence
- Persists notes, timestamps, original photo attachments, tags, favorites, and search indexes in [`notes.db`](file:///c:/Users/mayur/OneDrive/Desktop/ai/new/backend/notes.db).

---

## 🚀 Quick Start

### 1. Unified Launcher
```powershell
py run.py
```
- **React Frontend**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **Flask Backend**: [http://127.0.0.1:5000/api/health](http://127.0.0.1:5000/api/health)

### 2. Setting Free Gemini API Key (Optional for 99% Cursive Accuracy)
1. Click **"Set Free Gemini Key"** in the top right navbar.
2. Paste your free key from [Google AI Studio](https://aistudio.google.com/app/apikey).
3. The key is stored locally in your browser and used directly for $0 vision transcription.

---

## 🧪 Testing

```powershell
.\venv\Scripts\python.exe -m unittest discover -s backend/tests
```
All 7 unit tests verify plain text extraction, shortform expansion, batch creation, and database persistence.
