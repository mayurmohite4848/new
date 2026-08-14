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
  Plus
} from 'lucide-react';
import Navbar from './components/Navbar';
import StatsBar from './components/StatsBar';
import ImageUploader from './components/ImageUploader';
import NoteCard from './components/NoteCard';
import NoteModal from './components/NoteModal';
import ManualNoteModal from './components/ManualNoteModal';
import Toast from './components/Toast';
import { api } from './services/api';

export default function App() {
  const [notes, setNotes] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

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
      // Check health
      await api.checkHealth();
      setBackendOnline(true);

      // Fetch stats
      const statsRes = await api.getStats();
      setStats(statsRes.stats || {});

      // Fetch notes with current filters
      const notesRes = await api.getNotes({
        search: searchQuery,
        tag: selectedTag,
        favorite: showFavoritesOnly,
        sortBy: sortBy,
        order: sortOrder
      });
      setNotes(notesRes.notes || []);
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
  }, [searchQuery, selectedTag, showFavoritesOnly, sortBy, sortOrder]);

  // Initial load and filter change trigger
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toggle favorite
  const handleToggleFavorite = async (noteId, newStatus) => {
    try {
      const res = await api.updateNote(noteId, { is_favorite: newStatus });
      setNotes((prev) => prev.map((n) => (n.id === noteId ? res.note : n)));
      if (activeNote && activeNote.id === noteId) {
        setActiveNote(res.note);
      }
      // Refresh stats
      const statsRes = await api.getStats();
      setStats(statsRes.stats || {});
      addToast(newStatus ? 'Added to favorites' : 'Removed from favorites', 'info');
    } catch (err) {
      addToast('Failed to update favorite status.', 'error');
    }
  };

  // Handle note deletion
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

  // Handle note created
  const handleNoteCreated = (newNote) => {
    setNotes((prev) => [newNote, ...prev]);
    loadData();
  };

  // Handle note updated
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
        onOpenUpload={() => setShowUploader(!showUploader)}
        onOpenManualNote={() => setShowManualModal(true)}
        onRefresh={() => loadData(true)}
        refreshing={refreshing}
      />

      {/* Statistics & Tag Filter Bar */}
      <StatsBar
        stats={stats}
        selectedTag={selectedTag}
        onSelectTag={(t) => setSelectedTag(t)}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
      />

      {/* Collapsible Image Uploader Zone */}
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
            placeholder="Search notes, extracted text, metadata..."
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
          {/* Active Tag Filter Indicator */}
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
            Loading notes and images from SQLite...
          </div>
        </div>
      ) : notes.length > 0 ? (
        <div className={viewMode === 'grid' ? 'notes-grid' : 'notes-list'}>
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onSelect={(n) => setActiveNote(n)}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDeleteNote}
              showToast={addToast}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
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
              {searchQuery || selectedTag || showFavoritesOnly
                ? 'Try clearing your search query or tag filters to see all notes.'
                : 'Upload an image or create a text note to get started with note extraction.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            {(searchQuery || selectedTag || showFavoritesOnly) && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag('');
                  setShowFavoritesOnly(false);
                }}
              >
                Clear Filters
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => setShowUploader(true)}
            >
              <UploadCloud size={16} />
              <span>Upload Image Note</span>
            </button>
          </div>
        </div>
      )}

      {/* Note Detail & Inspection Modal */}
      {activeNote && (
        <NoteModal
          note={activeNote}
          onClose={() => setActiveNote(null)}
          onNoteUpdated={handleNoteUpdated}
          onNoteDeleted={handleDeleteNote}
          showToast={addToast}
        />
      )}

      {/* Manual Note Creation Modal */}
      {showManualModal && (
        <ManualNoteModal
          onClose={() => setShowManualModal(false)}
          onNoteCreated={handleNoteCreated}
          showToast={addToast}
        />
      )}
    </div>
  );
}
