import React, { useState } from 'react';
import { 
  X, 
  Star, 
  Trash2, 
  Save, 
  Calendar, 
  Copy, 
  Check, 
  Download, 
  Layers, 
  Tag as TagIcon,
  FileText,
  ExternalLink,
  Edit3
} from 'lucide-react';
import { api } from '../services/api';

export default function NoteModal({ 
  note, 
  onClose, 
  onNoteUpdated, 
  onNoteDeleted, 
  showToast 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [extractedText, setExtractedText] = useState(note?.extracted_text || '');
  const [tags, setTags] = useState(note?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(note?.is_favorite || false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!note) return null;

  const metadata = note.image_metadata || {};
  const hasImage = Boolean(note.image_filename);
  const imageUrl = note.image_filename ? `/api/uploads/${note.image_filename}` : null;

  const handleCopyText = () => {
    const textToCopy = extractedText || content || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      if (showToast) showToast('Text copied to clipboard!', 'info');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '').toLowerCase();
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showToast('Title cannot be empty.', 'error');
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updateNote(note.id, {
        title: title.trim(),
        content: content.trim(),
        extracted_text: extractedText.trim(),
        tags: tags,
        is_favorite: isFavorite
      });

      showToast('Note updated successfully!', 'success');
      setIsEditing(false);
      if (onNoteUpdated) onNoteUpdated(updated.note);
    } catch (err) {
      showToast(err.message || 'Failed to update note.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await api.deleteNote(note.id);
      showToast('Note deleted successfully.', 'info');
      if (onNoteDeleted) onNoteDeleted(note.id);
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to delete note.', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: hasImage ? '1000px' : '750px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, marginRight: '16px' }}>
            <button
              onClick={() => {
                setIsFavorite(!isFavorite);
                if (!isEditing) {
                  api.updateNote(note.id, { is_favorite: !isFavorite }).then(res => {
                    if (onNoteUpdated) onNoteUpdated(res.note);
                  });
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isFavorite ? '#f59e0b' : 'var(--text-dim)',
                padding: '2px'
              }}
              title={isFavorite ? 'Unfavorite' : 'Favorite'}
            >
              <Star size={20} fill={isFavorite ? '#f59e0b' : 'none'} />
            </button>

            {isEditing ? (
              <input
                type="text"
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ fontSize: '1.1rem', fontWeight: 700 }}
              />
            ) : (
              <h2 style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                lineHeight: 1.3
              }}>
                {title}
              </h2>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isEditing ? (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 size={15} />
                <span>Edit</span>
              </button>
            ) : (
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={15} />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
            )}

            <button 
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              title="Delete note"
            >
              <Trash2 size={15} />
            </button>

            <button 
              className="btn btn-ghost btn-icon"
              onClick={onClose}
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: hasImage ? 'minmax(280px, 360px) 1fr' : '1fr',
            gap: '24px'
          }}>
            {/* Left Column: Image & Technical Metadata */}
            {hasImage && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  background: '#040711',
                  border: '1px solid var(--border-subtle)',
                  maxHeight: '340px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <img
                    src={imageUrl}
                    alt={title}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'rgba(0,0,0,0.75)',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none'
                    }}
                  >
                    <ExternalLink size={12} /> Open Full
                  </a>
                </div>

                {/* Metadata Inspector Card */}
                <div style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.82rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={15} color="#818cf8" />
                    <span>Image Technical Metadata</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Resolution:</span>
                    <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                      {metadata.width || 'N/A'} × {metadata.height || 'N/A'} px
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Aspect Ratio:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {metadata.aspect_ratio || 'N/A'}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Format & Mode:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {metadata.format || 'IMG'} ({metadata.mode || 'RGB'})
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>File Size:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {metadata.file_size_human || 'N/A'}
                    </strong>
                  </div>

                  {note.created_at && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                      <span>Indexed On:</span>
                      <strong style={{ color: 'var(--text-main)' }}>
                        {note.created_at}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Right Column: Note Content & Extracted Text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Note Content */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Note Content & Body
                </label>
                {isEditing ? (
                  <textarea
                    className="textarea"
                    style={{ minHeight: '180px' }}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                ) : (
                  <div style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.92rem',
                    color: 'var(--text-main)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {content || 'No content added yet.'}
                  </div>
                )}
              </div>

              {/* Extracted Text Inspector */}
              {(extractedText || isEditing) && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Extracted Text / OCR Output
                    </label>
                    <button 
                      className="btn btn-ghost btn-sm"
                      onClick={handleCopyText}
                      style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                    >
                      {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                      <span>{copied ? 'Copied' : 'Copy Text'}</span>
                    </button>
                  </div>

                  {isEditing ? (
                    <textarea
                      className="textarea"
                      style={{ minHeight: '100px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                      value={extractedText}
                      onChange={(e) => setExtractedText(e.target.value)}
                      placeholder="Extracted text preview..."
                    />
                  ) : (
                    <div style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px dashed var(--border-subtle)',
                      fontSize: '0.82rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '140px',
                      overflowY: 'auto'
                    }}>
                      {extractedText || 'No text extracted from this note.'}
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Tags
                </label>
                {isEditing ? (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    {tags.map(t => (
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
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="Add tag and hit Enter..."
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        outline: 'none',
                        fontSize: '0.85rem',
                        minWidth: '100px',
                        flex: 1
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {tags.length > 0 ? (
                      tags.map(t => (
                        <span key={t} className="tag-badge">
                          #{t}
                        </span>
                      ))
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>No tags</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)'
        }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} />
            <span>Last updated: {note.updated_at || note.created_at}</span>
          </div>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
