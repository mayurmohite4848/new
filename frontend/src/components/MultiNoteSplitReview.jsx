import React, { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Tag, 
  Image as ImageIcon,
  FileText,
  Check
} from 'lucide-react';
import { api } from '../services/api';

export default function MultiNoteSplitReview({ 
  draftData, 
  onNotesCreated, 
  onCancel, 
  showToast 
}) {
  const initialSegments = (draftData?.segmented_notes && draftData.segmented_notes.length > 0)
    ? draftData.segmented_notes.map((s, idx) => ({
        id: `seg-${idx}-${Date.now()}`,
        title: s.title || `Note Topic ${idx + 1}`,
        content: s.content || '',
        tags: s.tags || ['notes', 'extracted'],
        segment_index: idx
      }))
    : [{
        id: `seg-0-${Date.now()}`,
        title: draftData?.title || 'Extracted Note',
        content: draftData?.content || '',
        tags: draftData?.tags || ['notes', 'extracted'],
        segment_index: 0
      }];

  const [notes, setNotes] = useState(initialSegments);
  const [saving, setSaving] = useState(false);
  const [tagInputs, setTagInputs] = useState({});

  const imageUrl = draftData?.image_url;

  const handleUpdateNote = (id, field, value) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const handleAddTag = (id, tagValue) => {
    const val = tagValue.trim().replace(/^#/, '').toLowerCase();
    if (!val) return;
    setNotes(prev => prev.map(n => {
      if (n.id === id) {
        const currentTags = n.tags || [];
        if (!currentTags.includes(val)) {
          return { ...n, tags: [...currentTags, val] };
        }
      }
      return n;
    }));
    setTagInputs(prev => ({ ...prev, [id]: '' }));
  };

  const handleRemoveTag = (id, tagToRemove) => {
    setNotes(prev => prev.map(n => {
      if (n.id === id) {
        return { ...n, tags: (n.tags || []).filter(t => t !== tagToRemove) };
      }
      return n;
    }));
  };

  const handleRemoveSegment = (id) => {
    if (notes.length <= 1) {
      showToast('You must keep at least one note.', 'error');
      return;
    }
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleAddNewSegment = () => {
    const newNote = {
      id: `seg-custom-${Date.now()}`,
      title: `Additional Topic ${notes.length + 1}`,
      content: '',
      tags: ['notes', 'custom'],
      segment_index: notes.length
    };
    setNotes([...notes, newNote]);
  };

  const handleSaveAll = async () => {
    if (notes.length === 0) return;

    const emptyTitle = notes.find(n => !n.title.trim());
    if (emptyTitle) {
      showToast('All notes must have a title.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payloadNotes = notes.map((n, idx) => ({
        title: n.title.trim(),
        content: n.content.trim(),
        extracted_text: n.content.trim(),
        image_filename: draftData.image_filename,
        image_path: draftData.image_url,
        image_metadata: draftData.image_metadata,
        ai_insights: draftData.ai_insights,
        tags: n.tags,
        source_image_filename: draftData.image_filename,
        segment_index: idx,
        is_favorite: false
      }));

      const res = await api.batchCreateNotes(payloadNotes);
      showToast(`Created ${res.count || payloadNotes.length} plain text notes in SQLite!`, 'success');
      if (onNotesCreated) {
        onNotesCreated(res.notes || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to save notes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      marginBottom: '32px',
      border: '1px solid var(--border-accent)',
      boxShadow: 'var(--shadow-lg)'
    }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={18} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Review Extracted Plain Text Notes ({notes.length} Topics)
              </h2>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Review the transcribed plain text notes below, edit titles or content, and save to SQLite.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
            {saving ? 'Creating Notes...' : (
              <>
                <Save size={16} />
                <span>Save All ({notes.length}) Notes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Layout: Left Photo vs Right Notes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(260px, 340px) 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Column: Untouched Original Image */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'sticky', top: '20px' }}>
          <div style={{
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: '#040711',
            border: '1px solid var(--border-subtle)',
            maxHeight: '340px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <img
              src={imageUrl}
              alt="Original Upload"
              style={{ maxWidth: '100%', maxHeight: '310px', objectFit: 'contain', borderRadius: '4px' }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>
            Original Untouched Photo ({draftData?.original_name || 'Upload'})
          </span>

          {/* Minimal AI Insights Pill */}
          {draftData?.ai_insights && (
            <div className="ai-summary-card">
              <div style={{ fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px', color: '#c7d2fe' }}>
                <Sparkles size={14} />
                <span>Summary: {draftData.ai_insights.core_concept || 'Extracted Topics'}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {(draftData.ai_insights.key_takeaways || []).map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Plain Text Note Drafts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {notes.map((seg, idx) => (
            <div
              key={seg.id}
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {/* Note Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: '#a5b4fc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    className="input"
                    value={seg.title}
                    onChange={(e) => handleUpdateNote(seg.id, 'title', e.target.value)}
                    style={{ fontWeight: 700, fontSize: '0.98rem', padding: '6px 10px' }}
                    placeholder="Note Title..."
                  />
                </div>

                {notes.length > 1 && (
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ width: '28px', height: '28px', color: 'var(--text-dim)' }}
                    onClick={() => handleRemoveSegment(seg.id)}
                    title="Remove Note"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Plain Text Note Content */}
              <textarea
                className="textarea"
                style={{
                  minHeight: '120px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.92rem',
                  lineHeight: '1.6'
                }}
                value={seg.content}
                onChange={(e) => handleUpdateNote(seg.id, 'content', e.target.value)}
                placeholder="Plain text content..."
              />

              {/* Tags */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-input)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)'
              }}>
                {(seg.tags || []).map(t => (
                  <span key={t} className="tag-badge" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                    #{t}
                    <X
                      size={11}
                      style={{ cursor: 'pointer', marginLeft: '3px' }}
                      onClick={() => handleRemoveTag(seg.id, t)}
                    />
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInputs[seg.id] || ''}
                  onChange={(e) => setTagInputs({ ...tagInputs, [seg.id]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTag(seg.id, tagInputs[seg.id] || '');
                    }
                  }}
                  placeholder="+ Add tag..."
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ffffff',
                    outline: 'none',
                    fontSize: '0.78rem',
                    minWidth: '80px',
                    flex: 1
                  }}
                />
              </div>
            </div>
          ))}

          {/* Add Another Note Button */}
          <button
            className="btn btn-secondary"
            onClick={handleAddNewSegment}
            style={{ borderStyle: 'dashed', padding: '12px' }}
          >
            <Plus size={16} />
            <span>Add Another Topic Note</span>
          </button>
        </div>
      </div>
    </div>
  );
}
