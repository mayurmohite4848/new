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
  FileText
} from 'lucide-react';
import { api } from '../services/api';

export default function NoteModal({ noteId, onClose, onNoteUpdated, onDeleteNote, showToast }) {
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'photo' | 'ai'
  
  // Edit mode state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchNoteDetail();
  }, [noteId]);

  const fetchNoteDetail = async () => {
    setLoading(true);
    try {
      const res = await api.getNoteById(noteId);
      const n = res.note;
      setNote(n);
      setTitle(n.title || '');
      setContent(n.content || n.extracted_text || '');
      setTags(n.tags || []);
      setIsFavorite(!!n.is_favorite);
    } catch (err) {
      showToast(err.message || 'Failed to load note.', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showToast('Title cannot be empty.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateNote(noteId, {
        title: title.trim(),
        content: content.trim(),
        tags,
        is_favorite: isFavorite
      });
      setNote(res.note);
      onNoteUpdated(res.note);
      showToast('Note saved successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save note.', 'error');
    } finally {
      setSaving(false);
    }
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
    showToast('Text copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="modal-backdrop">
        <div className="modal-content" style={{ padding: '40px', textAlign: 'center', maxWidth: '400px' }}>
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
          maxHeight: '92vh'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
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
              onClick={() => onDeleteNote(note.id)}
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

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 24px',
          background: 'rgba(15, 23, 42, 0.4)',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setActiveTab('notes')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.84rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'notes' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
              color: activeTab === 'notes' ? '#ffffff' : 'var(--text-muted)'
            }}
          >
            <FileText size={14} />
            <span>Plain Text Note</span>
          </button>

          {note.image_path && (
            <button
              onClick={() => setActiveTab('photo')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.84rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === 'photo' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                color: activeTab === 'photo' ? '#ffffff' : 'var(--text-muted)'
              }}
            >
              <ImageIcon size={14} />
              <span>Original Photo</span>
            </button>
          )}

          {note.ai_insights && (
            <button
              onClick={() => setActiveTab('ai')}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.84rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: activeTab === 'ai' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
                color: activeTab === 'ai' ? '#ffffff' : 'var(--text-muted)'
              }}
            >
              <Sparkles size={14} />
              <span>AI Takeaways</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dim)' }}>
                PLAIN TEXT CONTENT (EDITABLE):
              </label>
              <textarea
                className="textarea"
                style={{
                  minHeight: '320px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.95rem',
                  lineHeight: '1.7',
                  padding: '16px'
                }}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write or edit plain text notes here..."
              />
            </div>
          )}

          {activeTab === 'photo' && note.image_path && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              background: '#040711',
              padding: '20px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}>
              <img
                src={note.image_path}
                alt="Original Photo"
                style={{ maxWidth: '100%', maxHeight: '480px', objectFit: 'contain', borderRadius: '6px' }}
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                Original Untouched Photo ({note.image_filename})
              </span>
            </div>
          )}

          {activeTab === 'ai' && note.ai_insights && (
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
          )}
        </div>

        {/* Tags Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(15, 23, 42, 0.4)'
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
