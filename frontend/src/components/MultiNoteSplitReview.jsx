import React, { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  ArrowRight, 
  Check, 
  Tag, 
  Eye, 
  Image as ImageIcon,
  BookOpen,
  Wand2,
  FileText
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
        title: s.title || `Note Part ${idx + 1}`,
        content: s.content || '',
        raw_text: s.raw_text || s.content || '',
        handwriting_style: s.handwriting_style || 'font-caveat',
        tags: s.tags || ['white-canvas', 'handwritten'],
        segment_index: idx
      }))
    : [{
        id: `seg-0-${Date.now()}`,
        title: draftData?.title || 'Extracted Note',
        content: draftData?.content || '',
        raw_text: draftData?.extracted_text || draftData?.content || '',
        handwriting_style: 'font-caveat',
        tags: draftData?.tags || ['white-canvas', 'handwritten'],
        segment_index: 0
      }];

  const [notes, setNotes] = useState(initialSegments);
  const [saving, setSaving] = useState(false);
  const [tagInputs, setTagInputs] = useState({});
  const [previewMode, setPreviewMode] = useState('clean'); // 'clean' | 'raw'
  const [decipherMode, setDecipherMode] = useState('expanded'); // 'expanded' | 'raw'

  const cleanedImageUrl = draftData?.cleaned_image_url;
  const rawImageUrl = draftData?.image_url;

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
      raw_text: '',
      handwriting_style: 'font-caveat',
      tags: ['white-canvas', 'custom-split'],
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
        cleaned_image_filename: draftData.cleaned_image_filename,
        cleaned_image_path: draftData.cleaned_image_url,
        image_metadata: draftData.image_metadata,
        ai_insights: draftData.ai_insights,
        handwriting_style: n.handwriting_style,
        tags: n.tags,
        source_image_filename: draftData.image_filename,
        segment_index: idx,
        is_favorite: false
      }));

      const res = await api.batchCreateNotes(payloadNotes);
      showToast(`Created ${res.count || payloadNotes.length} notes in SQLite!`, 'success');
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
      border: '1px solid rgba(99, 102, 241, 0.35)',
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
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Layers size={18} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Review & Split: Identified {notes.length} Note Topics
              </h2>
              <span className="tag-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                ✨ Shorthands & Shortforms Deciphered
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Handwritten abbreviations (e.g., w/, b/c, mgmt, arch, db) have been automatically expanded and reconstructed.
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
                <span>Save All ({notes.length}) Notes to SQLite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(280px, 360px) 1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Column: Image Canvas Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'sticky', top: '20px' }}>
          {/* Toggle Clean vs Raw */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-input)', padding: '2px', borderRadius: '6px' }}>
            <button
              onClick={() => setPreviewMode('clean')}
              style={{
                flex: 1,
                padding: '6px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: previewMode === 'clean' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                color: previewMode === 'clean' ? '#ffffff' : 'var(--text-muted)'
              }}
            >
              ✨ Clean White Canvas
            </button>
            <button
              onClick={() => setPreviewMode('raw')}
              style={{
                flex: 1,
                padding: '6px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: previewMode === 'raw' ? 'rgba(99, 102, 241, 0.35)' : 'transparent',
                color: previewMode === 'raw' ? '#ffffff' : 'var(--text-muted)'
              }}
            >
              📸 Original Photo
            </button>
          </div>

          {/* Image Box */}
          <div style={{
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: previewMode === 'clean' ? '#ffffff' : '#040711',
            border: '1px solid var(--border-subtle)',
            maxHeight: '340px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: previewMode === 'clean' ? '12px' : '0',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <img
              src={previewMode === 'clean' ? cleanedImageUrl : rawImageUrl}
              alt="Source Scan"
              style={{ maxWidth: '100%', maxHeight: '310px', objectFit: 'contain' }}
            />
          </div>

          {/* Decipher Helper Banner */}
          <div style={{
            padding: '12px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            fontSize: '0.78rem',
            color: '#c7d2fe'
          }}>
            <strong>💡 Handwriting Disambiguation Active:</strong> Difficult handwriting strokes and technical shortforms were disambiguated into clear, full words.
          </div>

          {/* Minimal AI Insights Pill */}
          {draftData?.ai_insights && (
            <div className="ai-sticky-note" style={{ transform: 'none', fontSize: '0.8rem' }}>
              <div style={{ fontWeight: 700, color: '#854d0e', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={14} color="#ca8a04" />
                <span>AI Concept: {draftData.ai_insights.core_concept || 'Extracted Topics'}</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {(draftData.ai_insights.key_takeaways || []).map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Segmented Note Drafts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {notes.map((seg, idx) => (
            <div
              key={seg.id}
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 'var(--radius-md)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative'
              }}
            >
              {/* Note Header & Font selector */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Handwriting Font Picker */}
                  <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-input)', padding: '2px', borderRadius: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleUpdateNote(seg.id, 'handwriting_style', 'font-caveat')}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '3px',
                        border: 'none',
                        cursor: 'pointer',
                        background: seg.handwriting_style === 'font-caveat' ? 'var(--accent-primary)' : 'transparent',
                        color: '#fff',
                        fontFamily: 'var(--font-hand-caveat)',
                        fontSize: '0.88rem'
                      }}
                      title="Caveat"
                    >
                      Caveat
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateNote(seg.id, 'handwriting_style', 'font-kalam')}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '3px',
                        border: 'none',
                        cursor: 'pointer',
                        background: seg.handwriting_style === 'font-kalam' ? 'var(--accent-primary)' : 'transparent',
                        color: '#fff',
                        fontFamily: 'var(--font-hand-kalam)',
                        fontSize: '0.78rem'
                      }}
                      title="Kalam"
                    >
                      Kalam
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateNote(seg.id, 'handwriting_style', 'font-architect')}
                      style={{
                        padding: '2px 8px',
                        borderRadius: '3px',
                        border: 'none',
                        cursor: 'pointer',
                        background: seg.handwriting_style === 'font-architect' ? 'var(--accent-primary)' : 'transparent',
                        color: '#fff',
                        fontFamily: 'var(--font-hand-architect)',
                        fontSize: '0.74rem'
                      }}
                      title="Architect"
                    >
                      Architect
                    </button>
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
              </div>

              {/* Note Content Textarea */}
              <textarea
                className="textarea"
                style={{
                  minHeight: '100px',
                  lineHeight: '1.6'
                }}
                value={seg.content}
                onChange={(e) => handleUpdateNote(seg.id, 'content', e.target.value)}
                placeholder="Content of this note..."
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
            <span>Add Another Split Note Topic</span>
          </button>
        </div>
      </div>
    </div>
  );
}
