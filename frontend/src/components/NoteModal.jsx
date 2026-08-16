import React, { useState, useEffect } from 'react';
import { 
  X, 
  Star, 
  Trash2, 
  Sparkles, 
  Save, 
  Tag, 
  Calendar, 
  Clock, 
  Image as ImageIcon,
  Copy,
  Check,
  FileText,
  Columns2,
  Eye
} from 'lucide-react';
import { api } from '../services/api';

export default function NoteModal({ 
  note: initialNote, 
  noteId, 
  onClose, 
  onNoteUpdated, 
  onDeleteNote, 
  onNoteDeleted, 
  showToast 
}) {
  const targetNoteId = noteId || (initialNote && initialNote.id);
  const [note, setNote] = useState(initialNote || null);
  const [loading, setLoading] = useState(!initialNote && !!targetNoteId);
  
  // 3-Way View Layout: 'split' | 'notes' | 'photo' | 'ai'
  const [viewLayout, setViewLayout] = useState(initialNote?.image_path ? 'split' : 'notes');
  
  // Edit mode state
  const [title, setTitle] = useState(initialNote?.title || '');
  const [content, setContent] = useState(initialNote?.content || initialNote?.extracted_text || '');
  const [tags, setTags] = useState(initialNote?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(!!initialNote?.is_favorite);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (targetNoteId) {
      fetchNoteDetail(targetNoteId);
    }
  }, [targetNoteId]);

  const fetchNoteDetail = async (id) => {
    try {
      const res = await api.getNoteById(id);
      const n = res.note;
      setNote(n);
      setTitle(n.title || '');
      setContent(n.content || n.extracted_text || '');
      setTags(n.tags || []);
      setIsFavorite(!!n.is_favorite);
      if (!n.image_path) {
        setViewLayout('notes');
      }
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to load note.', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const hasImage = !!note?.image_path;
  const currentLayout = hasImage ? viewLayout : (viewLayout === 'ai' ? 'ai' : 'notes');

  const handleSave = async () => {
    if (!title.trim()) {
      if (showToast) showToast('Title cannot be empty.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateNote(targetNoteId, {
        title: title.trim(),
        content: content.trim(),
        tags,
        is_favorite: isFavorite
      });
      setNote(res.note);
      if (onNoteUpdated) onNoteUpdated(res.note);
      if (showToast) showToast('Note saved successfully!', 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to save note.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (onDeleteNote) onDeleteNote(targetNoteId);
    else if (onNoteDeleted) onNoteDeleted(targetNoteId);
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '').toLowerCase();
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    if (showToast) showToast('Text copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
          <p style={{ color: 'var(--text-muted)' }}>Loading note...</p>
        </div>
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '1280px',
          width: '96vw',
          height: '92vh',
          maxHeight: '94vh',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          gap: '16px',
          background: 'rgba(15, 23, 42, 0.95)',
          flexWrap: 'wrap'
        }}>
          {/* Note Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
            <button
              className="btn btn-ghost btn-icon"
              style={{ color: isFavorite ? '#fbbf24' : 'var(--text-dim)' }}
              onClick={() => setIsFavorite(!isFavorite)}
              title={isFavorite ? "Unfavorite" : "Favorite"}
            >
              <Star size={20} fill={isFavorite ? '#fbbf24' : 'none'} />
            </button>
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note Title..."
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                background: 'transparent',
                border: '1px solid transparent',
                padding: '6px 8px'
              }}
            />
          </div>

          {/* 3-Way Layout Switcher (Notes Only | Split View | Photo Only | AI Takeaways) */}
          <div style={{
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.8)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: '3px'
          }}>
            <button
              onClick={() => setViewLayout('notes')}
              title="Full-Width Notes Only"
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: currentLayout === 'notes' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                color: currentLayout === 'notes' ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.15s ease'
              }}
            >
              <FileText size={13} />
              <span>Notes Only</span>
            </button>

            {hasImage && (
              <>
                <button
                  onClick={() => setViewLayout('split')}
                  title="Side-by-Side Split View"
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: currentLayout === 'split' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                    color: currentLayout === 'split' ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Columns2 size={13} />
                  <span>Split View</span>
                </button>

                <button
                  onClick={() => setViewLayout('photo')}
                  title="Original Photo Only"
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: currentLayout === 'photo' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                    color: currentLayout === 'photo' ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ImageIcon size={13} />
                  <span>Photo Only</span>
                </button>
              </>
            )}

            {note.ai_insights && (
              <button
                onClick={() => setViewLayout('ai')}
                title="AI Summary & Insights"
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: currentLayout === 'ai' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                  color: currentLayout === 'ai' ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sparkles size={13} />
                <span>AI Insights</span>
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={handleCopyText}
              title="Copy plain text"
            >
              {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={14} />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>

            <button
              className="btn btn-danger btn-sm btn-icon"
              onClick={handleDelete}
              title="Delete Note"
            >
              <Trash2 size={16} />
            </button>

            <button
              className="btn btn-ghost btn-icon"
              onClick={onClose}
              title="Close Modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Body: Dynamic Layout Switcher */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: currentLayout === 'split' ? '1.1fr 0.9fr' : '1fr',
          flex: 1,
          overflow: 'hidden',
          background: 'var(--bg-surface)'
        }}>
          {/* Column 1: Plain Text Editor (Shown in 'notes' and 'split' modes) */}
          {currentLayout !== 'photo' && currentLayout !== 'ai' && (
            <div style={{
              padding: '24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              borderRight: currentLayout === 'split' ? '1px solid var(--border-subtle)' : 'none'
            }}>
              {/* Informative banner when photo is hidden */}
              {hasImage && currentLayout === 'notes' && (
                <div style={{
                  padding: '8px 14px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Eye size={14} color="#818cf8" />
                    <span>Original photo is hidden (Full-Width Focus Mode)</span>
                  </div>
                  <button
                    onClick={() => setViewLayout('split')}
                    style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}
                  >
                    Show Photo in Split View &rarr;
                  </button>
                </div>
              )}

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '6px' }}>
                  PLAIN TEXT CONTENT (EDITABLE):
                </label>
                <textarea
                  className="textarea"
                  style={{
                    flex: 1,
                    minHeight: '380px',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.96rem',
                    lineHeight: '1.7',
                    padding: '16px'
                  }}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write or edit plain text notes here..."
                />
              </div>
            </div>
          )}

          {/* Column 2: Original Photo (Shown in 'photo' and 'split' modes) */}
          {hasImage && (currentLayout === 'photo' || currentLayout === 'split') && (
            <div style={{
              background: '#040711',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              gap: '12px'
            }}>
              <div style={{
                flex: 1,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                borderRadius: '8px',
                background: '#000000'
              }}>
                <img
                  src={note.image_path}
                  alt="Original Photo"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <span>Untouched Original Photo ({note.image_filename})</span>
                {currentLayout === 'photo' && (
                  <button
                    onClick={() => setViewLayout('split')}
                    style={{ background: 'transparent', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Back to Split View
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Column 3: AI Takeaways (Shown when AI view selected) */}
          {currentLayout === 'ai' && note.ai_insights && (
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div className="ai-summary-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '10px', color: '#c7d2fe' }}>
                  <Sparkles size={16} />
                  <span>Concept: {note.ai_insights.core_concept || 'Extracted Note'}</span>
                </div>
                <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(note.ai_insights.key_takeaways || []).map((pt, i) => (
                    <li key={i} style={{ lineHeight: '1.5' }}>{pt}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Tags Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(15, 23, 42, 0.95)'
        }}>
          <Tag size={15} color="var(--text-dim)" />
          {tags.map((t) => (
            <span key={t} className="tag-badge">
              #{t}
              <X
                size={12}
                style={{ cursor: 'pointer', marginLeft: '4px' }}
                onClick={() => handleRemoveTag(t)}
              />
            </span>
          ))}
          <input
            type="text"
            className="input"
            style={{
              width: '140px',
              padding: '4px 8px',
              fontSize: '0.8rem',
              height: '28px'
            }}
            placeholder="+ Add tag..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
          />
        </div>
      </div>
    </div>
  );
}
