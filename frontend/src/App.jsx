import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  UploadCloud, 
  Sparkles, 
  FileText, 
  Filter, 
  X,
  Plus,
  BookOpen,
  Layers
} from 'lucide-react';
import Navbar from './components/Navbar';
import StatsBar from './components/StatsBar';
import ImageUploader from './components/ImageUploader';
import NoteCard from './components/NoteCard';
import NoteModal from './components/NoteModal';
import ManualNoteModal from './components/ManualNoteModal';
import NotebookCard from './components/NotebookCard';
import NotebookBatchUploader from './components/NotebookBatchUploader';
import NotebookReaderModal from './components/NotebookReaderModal';
import Toast from './components/Toast';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'notebooks'
  
  // Single Notes State
  const [notes, setNotes] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  // Notebooks State
  const [notebooks, setNotebooks] = useState([]);
  const [loadingNotebooks, setLoadingNotebooks] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('');

  // Search and Filter controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Modals & Panels
  const [showUploader, setShowUploader] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const [showBatchUploader, setShowBatchUploader] = useState(false);
  const [activeNotebookId, setActiveNotebookId] = useState(null);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch stats and notes from Flask API
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      await api.checkHealth();
      setBackendOnline(true);

      const statsRes = await api.getStats();
      setStats(statsRes.stats || {});

      // Load single notes
      const notesRes = await api.getNotes({
        search: searchQuery,
        tag: selectedTag,
        favorite: showFavoritesOnly,
        sortBy: sortBy,
        order: sortOrder
      });
      setNotes(notesRes.notes || []);

      // Load notebooks
      const nbRes = await api.getNotebooks({
        search: searchQuery,
        subject: selectedSubject
      });
      setNotebooks(nbRes.notebooks || []);

    } catch (err) {
      setBackendOnline(false);
      console.error('Error fetching data from backend:', err);
      if (isRefresh) {
        addToast('Could not connect to Flask backend.', 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedTag, selectedSubject, showFavoritesOnly, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle favorite for note
  const handleToggleFavorite = async (noteId, newStatus) => {
    try {
      const res = await api.updateNote(noteId, { is_favorite: newStatus });
      setNotes((prev) => prev.map((n) => (n.id === noteId ? res.note : n)));
      if (activeNote && activeNote.id === noteId) {
        setActiveNote(res.note);
      }
      const statsRes = await api.getStats();
      setStats(statsRes.stats || {});
      addToast(newStatus ? 'Added to favorites' : 'Removed from favorites', 'info');
    } catch (err) {
      addToast('Failed to update favorite status.', 'error');
    }
  };

  // Handle single note deletion
  const handleDeleteNote = async (noteId) => {
    try {
      await api.deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      if (activeNote && activeNote.id === noteId) {
        setActiveNote(null);
      }
      const statsRes = await api.getStats();
      setStats(statsRes.stats || {});
      addToast('Note deleted from database.', 'info');
    } catch (err) {
      addToast('Failed to delete note.', 'error');
    }
  };

  // Handle notebook deletion
  const handleDeleteNotebook = async (notebookId) => {
    try {
      await api.deleteNotebook(notebookId);
      setNotebooks((prev) => prev.filter((nb) => nb.id !== notebookId));
      if (activeNotebookId === notebookId) {
        setActiveNotebookId(null);
      }
      const statsRes = await api.getStats();
      setStats(statsRes.stats || {});
      addToast('Notebook deleted from database.', 'info');
    } catch (err) {
      addToast('Failed to delete notebook.', 'error');
    }
  };

  const handleNoteCreated = (newNote) => {
    setNotes((prev) => [newNote, ...prev]);
    loadData();
  };

  const handleNotebookCreated = (newNotebook) => {
    setNotebooks((prev) => [newNotebook, ...prev]);
    setActiveTab('notebooks');
    loadData();
    setActiveNotebookId(newNotebook.id);
  };

  const handleNoteUpdated = (updatedNote) => {
    setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
    setActiveNote(updatedNote);
    loadData();
  };

  return (
    <div className="app-container">
      {/* Toast Alerts */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Top Header Navbar */}
      <Navbar
        backendOnline={backendOnline}
        activeTab={activeTab}
        onChangeTab={(t) => setActiveTab(t)}
        onNewNote={() => setShowManualModal(true)}
        onOpenManualNote={() => setShowManualModal(true)}
        onNewUpload={() => setShowUploader(prev => !prev)}
        onOpenUpload={() => setShowUploader(prev => !prev)}
        onOpenBatchNotebook={() => setShowBatchUploader(true)}
        stats={stats}
        onRefresh={() => loadData(true)}
        refreshing={refreshing}
        showToast={addToast}
      />

      {/* Statistics & Filter Bar */}
      <StatsBar
        stats={stats}
        selectedTag={selectedTag}
        onSelectTag={(t) => setSelectedTag(t)}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
      />

      {/* Single Image Uploader Dropzone */}
      {showUploader && (
        <ImageUploader
          onNoteCreated={handleNoteCreated}
          showToast={addToast}
          onClose={() => setShowUploader(false)}
        />
      )}

      {/* Search & Layout Control Toolbar */}
      <div className="glass-panel" style={{
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        marginBottom: '20px'
      }}>
        {/* Search Input */}
        <div style={{
          position: 'relative',
          flex: '1 1 280px',
          maxWidth: '500px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={17} color="var(--text-dim)" style={{ position: 'absolute', left: '12px' }} />
          <input
            type="text"
            className="input"
            style={{ paddingLeft: '38px', paddingRight: searchQuery ? '36px' : '14px' }}
            placeholder={activeTab === 'notebooks' ? "Search notebooks, subjects, descriptions..." : "Search notes, text, tags..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '2px'
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filters & View Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {selectedTag && (
            <span className="tag-badge" style={{ padding: '6px 12px' }}>
              Tag: #{selectedTag}
              <X 
                size={12} 
                style={{ cursor: 'pointer', marginLeft: '4px' }} 
                onClick={() => setSelectedTag('')}
              />
            </span>
          )}

          {/* Quick Action in Toolbar */}
          {activeTab === 'notebooks' ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowBatchUploader(true)}
            >
              <Plus size={15} />
              <span>Create Notebook</span>
            </button>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowBatchUploader(true)}
            >
              <BookOpen size={14} />
              <span>Batch / PDF to Notebook</span>
            </button>
          )}

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={15} color="var(--text-dim)" />
            <select
              className="select"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, ord] = e.target.value.split('-');
                setSortBy(by);
                setSortOrder(ord);
              }}
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
            </select>
          </div>

          {/* Grid vs List View Switcher */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            padding: '2px'
          }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                color: viewMode === 'grid' ? '#ffffff' : 'var(--text-dim)',
                border: 'none',
                padding: '6px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                color: viewMode === 'list' ? '#ffffff' : 'var(--text-dim)',
                border: 'none',
                padding: '6px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <div className="animate-pulse-subtle" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
            Loading notes and notebooks from SQLite...
          </div>
        </div>
      ) : activeTab === 'notebooks' ? (
        /* NOTEBOOKS VIEW */
        notebooks.length > 0 ? (
          <div className={viewMode === 'grid' ? 'notes-grid' : 'notes-list'}>
            {notebooks.map((nb) => (
              <NotebookCard
                key={nb.id}
                notebook={nb}
                onOpen={(n) => setActiveNotebookId(n.id)}
                onDelete={handleDeleteNotebook}
                showToast={addToast}
              />
            ))}
          </div>
        ) : (
          /* Empty State for Notebooks */
          <div className="glass-panel" style={{
            textAlign: 'center',
            padding: '60px 20px',
            margin: '20px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8'
            }}>
              <BookOpen size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                No Multi-Page Notebooks Created Yet
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '460px' }}>
                Upload multiple handwritten pages at once or a scanned PDF to build a structured multi-page notebook with PDF export.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowBatchUploader(true)}
            >
              <Sparkles size={16} />
              <span>Create First Multi-Page Notebook</span>
            </button>
          </div>
        )
      ) : (
        /* SINGLE NOTES VIEW */
        notes.length > 0 ? (
          <div className={viewMode === 'grid' ? 'notes-grid' : 'notes-list'}>
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onClick={() => setActiveNote(note)}
                onSelect={() => setActiveNote(note)}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDeleteNote}
                showToast={addToast}
              />
            ))}
          </div>
        ) : (
          /* Empty State for Notes */
          <div className="glass-panel" style={{
            textAlign: 'center',
            padding: '60px 20px',
            margin: '20px 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8'
            }}>
              <FileText size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {searchQuery || selectedTag || showFavoritesOnly
                  ? 'No matching notes found'
                  : 'No notes stored in SQLite yet'}
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '420px' }}>
                Upload a handwritten photo or create a plain text note to get started.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={() => setShowUploader(true)}
              >
                <UploadCloud size={16} />
                <span>Transcribe Single Photo</span>
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowBatchUploader(true)}
              >
                <BookOpen size={16} />
                <span>Create Notebook</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* Note Detail Modal */}
      {activeNote && (
        <NoteModal
          note={activeNote}
          noteId={activeNote.id}
          onClose={() => setActiveNote(null)}
          onNoteUpdated={handleNoteUpdated}
          onDeleteNote={handleDeleteNote}
          onNoteDeleted={handleDeleteNote}
          showToast={addToast}
        />
      )}

      {/* Manual Single Note Creation Modal */}
      {showManualModal && (
        <ManualNoteModal
          onClose={() => setShowManualModal(false)}
          onNoteCreated={handleNoteCreated}
          showToast={addToast}
        />
      )}

      {/* Multi-Page Notebook Batch Uploader Modal */}
      {showBatchUploader && (
        <NotebookBatchUploader
          onClose={() => setShowBatchUploader(false)}
          onNotebookCreated={handleNotebookCreated}
          showToast={addToast}
        />
      )}

      {/* Interactive Multi-Page Notebook Reader Modal */}
      {activeNotebookId && (
        <NotebookReaderModal
          notebookId={activeNotebookId}
          onClose={() => setActiveNotebookId(null)}
          onNotebookUpdated={loadData}
          showToast={addToast}
        />
      )}
    </div>
  );
}
