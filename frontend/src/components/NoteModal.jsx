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
  Edit3,
  Sparkles,
  Image as ImageIcon,
  BookOpen
} from 'lucide-react';
import WhiteboardNoteCanvas from './WhiteboardNoteCanvas';
import { api } from '../services/api';

export default function NoteModal({ 
  note, 
  onClose, 
  onNoteUpdated, 
  onNoteDeleted, 
  showToast 
}) {
  const [activeTab, setActiveTab] = useState('sheet'); // 'sheet' | 'ink' | 'ai' | 'original' | 'meta'
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [extractedText, setExtractedText] = useState(note?.extracted_text || '');
  const [handwritingStyle, setHandwritingStyle] = useState(note?.handwriting_style || 'font-caveat');
  const [tags, setTags] = useState(note?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(note?.is_favorite || false);
  const [saving, setSaving] = useState(false);
  const [enhancingAi, setEnhancingAi] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!note) return null;

  const metadata = note.image_metadata || {};
  const hasImage = Boolean(note.image_filename);
  const rawImageUrl = note.image_filename ? `/api/uploads/${note.image_filename}` : null;
  const cleanedImageUrl = note.cleaned_image_filename 
    ? `/api/uploads/${note.cleaned_image_filename}` 
    : rawImageUrl;

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
        handwriting_style: handwritingStyle,
        tags: tags,
        is_favorite: isFavorite
      });

      showToast('Note saved successfully!', 'success');
      setIsEditing(false);
      if (onNoteUpdated) onNoteUpdated(updated.note);
    } catch (err) {
      showToast(err.message || 'Failed to update note.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerAiEnhance = async () => {
    setEnhancingAi(true);
    try {
      const res = await api.enhanceNoteAI(note.id);
      showToast('Minimal AI insights refreshed with zero cost!', 'success');
      if (onNoteUpdated) onNoteUpdated(res.note);
    } catch (err) {
      showToast(err.message || 'Failed to enhance with AI.', 'error');
    } finally {
      setEnhancingAi(false);
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
          maxWidth: '1050px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '240px' }}>
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
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-main)',
                lineHeight: 1.3
              }}>
                {title}
              </h2>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleTriggerAiEnhance}
              disabled={enhancingAi}
              title="Generate or refresh zero-cost minimal AI insights"
            >
              <Sparkles size={14} color="#eab308" className={enhancingAi ? 'animate-pulse-subtle' : ''} />
              <span>{enhancingAi ? 'Generating AI...' : 'Refresh AI'}</span>
            </button>

            {!isEditing ? (
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 size={14} />
                <span>Edit Note</span>
              </button>
            ) : (
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={14} />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
            )}

            <button 
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              title="Delete note"
            >
              <Trash2 size={14} />
            </button>

            <button 
              className="btn btn-ghost btn-icon"
              onClick={onClose}
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 24px',
          background: 'rgba(11, 17, 33, 0.9)',
          borderBottom: '1px solid var(--border-subtle)',
          overflowX: 'auto'
        }}>
          <button
            className={`tab-btn ${activeTab === 'sheet' ? 'active' : ''}`}
            onClick={() => setActiveTab('sheet')}
          >
            <BookOpen size={14} />
            <span>Clean White Note Sheet</span>
          </button>

          {cleanedImageUrl && (
            <button
              className={`tab-btn ${activeTab === 'ink' ? 'active' : ''}`}
              onClick={() => setActiveTab('ink')}
            >
              <Layers size={14} />
              <span>Clean Inked Scan</span>
            </button>
          )}

          <button
            className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            <Sparkles size={14} color="#facc15" />
            <span>Minimal AI Insights</span>
          </button>

          {rawImageUrl && (
            <button
              className={`tab-btn ${activeTab === 'original' ? 'active' : ''}`}
              onClick={() => setActiveTab('original')}
            >
              <ImageIcon size={14} />
              <span>Original Photo</span>
            </button>
          )}

          <button
            className={`tab-btn ${activeTab === 'meta' ? 'active' : ''}`}
            onClick={() => setActiveTab('meta')}
          >
            <FileText size={14} />
            <span>Metadata & Raw OCR</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {isEditing && (
            /* Editing Banner */
            <div className="glass-panel" style={{
              padding: '16px',
              border: '1px solid var(--accent-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Handwritten Note Content (Editable)
                </label>
                <textarea
                  className="textarea"
                  style={{ minHeight: '140px' }}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Tags
                </label>
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
                    placeholder="Add tag and press Enter..."
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
              </div>
            </div>
          )}

          {/* TAB 1: Clean White Note Sheet (Default) */}
          {activeTab === 'sheet' && (
            <WhiteboardNoteCanvas
              note={{
                ...note,
                title,
                content,
                extracted_text: extractedText,
                handwriting_style: handwritingStyle,
                tags
              }}
              onUpdateStyle={(newStyle) => {
                setHandwritingStyle(newStyle);
                api.updateNote(note.id, { handwriting_style: newStyle });
              }}
              showToast={showToast}
            />
          )}

          {/* TAB 2: Clean Inked Scan on White Canvas */}
          {activeTab === 'ink' && cleanedImageUrl && (
            <div style={{
              background: '#ffffff',
              padding: '24px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>
              <div style={{
                fontSize: '0.9rem',
                color: '#334155',
                fontWeight: 600,
                textAlign: 'center'
              }}>
                Extracted Ink Strokes (Background Removed onto Pure White Canvas)
              </div>
              <img
                src={cleanedImageUrl}
                alt="Clean Inked Scan"
                style={{
                  maxWidth: '100%',
                  maxHeight: '520px',
                  objectFit: 'contain'
                }}
              />
              <a
                href={cleanedImageUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ color: '#0f172a', borderColor: '#cbd5e1' }}
              >
                <Download size={14} />
                <span>Open Clean Inked PNG</span>
              </a>
            </div>
          )}

          {/* TAB 3: Minimal AI Insights */}
          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="ai-sticky-note" style={{ transform: 'none', maxWidth: '100%' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  borderBottom: '1px dashed #ca8a04',
                  paddingBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1rem' }}>
                    <Sparkles size={18} color="#ca8a04" />
                    <span>Minimal AI Supplementary Notes (Zero Cost)</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#a16207', fontWeight: 600 }}>
                    100% Local / Free
                  </span>
                </div>

                {note.ai_insights?.core_concept && (
                  <div style={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    marginBottom: '14px',
                    background: 'rgba(255, 255, 255, 0.6)',
                    padding: '8px 12px',
                    borderRadius: '6px'
                  }}>
                    💡 Core Subject: {note.ai_insights.core_concept}
                  </div>
                )}

                <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '6px' }}>
                  Key Takeaways (Kept strictly minimal):
                </div>
                <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                  {(note.ai_insights?.key_takeaways || ['Note content extracted and indexed.']).map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>

                {note.ai_insights?.diagram_data?.steps && (
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.7)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#854d0e', marginBottom: '8px' }}>
                      Conceptual Flow / Outline:
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {note.ai_insights.diagram_data.steps.map((st, idx) => (
                        <span key={idx} style={{
                          background: '#fef08a',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #ca8a04',
                          fontWeight: 600,
                          fontSize: '0.8rem'
                        }}>
                          {st}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Original Photo */}
          {activeTab === 'original' && rawImageUrl && (
            <div style={{
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#040711',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '16px',
              gap: '12px'
            }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Original Raw Camera Upload
              </div>
              <img
                src={rawImageUrl}
                alt="Original Upload"
                style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
              />
              <a
                href={rawImageUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <ExternalLink size={14} />
                <span>Open Full Original File</span>
              </a>
            </div>
          )}

          {/* TAB 5: Metadata & Raw OCR */}
          {activeTab === 'meta' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 360px) 1fr', gap: '20px' }}>
              {/* Technical Table */}
              <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                  📐 Image Properties
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>Dimensions:</span>
                  <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                    {metadata.width || 'N/A'} × {metadata.height || 'N/A'} px
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>Aspect Ratio:</span>
                  <strong style={{ color: 'var(--text-main)' }}>{metadata.aspect_ratio || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>Format:</span>
                  <strong style={{ color: 'var(--text-main)' }}>{metadata.format || 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>Size:</span>
                  <strong style={{ color: 'var(--text-main)' }}>{metadata.file_size_human || 'N/A'}</strong>
                </div>
              </div>

              {/* Raw OCR text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Raw Extracted Text
                  </label>
                  <button className="btn btn-ghost btn-sm" onClick={handleCopyText}>
                    {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-main)',
                  whiteSpace: 'pre-wrap',
                  minHeight: '160px'
                }}>
                  {extractedText || 'No OCR text extracted.'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
