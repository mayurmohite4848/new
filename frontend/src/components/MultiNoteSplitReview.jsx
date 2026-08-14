import React, { useState } from 'react';
import { 
  Sparkles, 
  Save, 
  X, 
  Tag, 
  Image as ImageIcon,
  FileText,
  Check,
  Edit3
} from 'lucide-react';
import { api } from '../services/api';

export default function MultiNoteSplitReview({ 
  draftData, 
  onNotesCreated, 
  onCancel, 
  showToast 
}) {
  const initialNote = (draftData?.segmented_notes && draftData.segmented_notes.length > 0)
    ? draftData.segmented_notes[0]
    : {
        title: draftData?.title || 'Extracted Note',
        content: draftData?.content || draftData?.extracted_text || '',
        tags: draftData?.tags || ['notes', 'extracted'],
        segment_index: 0
      };

  const [title, setTitle] = useState(initialNote.title || 'Untitled Note');
  const [content, setContent] = useState(initialNote.content || draftData?.extracted_text || '');
  const [tags, setTags] = useState(initialNote.tags || ['notes']);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState('split'); // 'split' | 'note' | 'photo'

  const imageUrl = draftData?.image_url;

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

  const handleSaveNote = async () => {
    if (!title.trim()) {
      showToast('Please provide a title for the note.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        extracted_text: draftData?.extracted_text || content.trim(),
        image_filename: draftData?.image_filename,
        image_path: imageUrl,
        image_metadata: draftData?.image_metadata,
        ai_insights: draftData?.ai_insights,
        source_image_filename: draftData?.image_filename,
        segment_index: 0,
        tags: tags,
        is_favorite: false
      };

      const res = await api.createNote(payload);
      showToast('Note successfully saved to SQLite!', 'success');
      if (onNotesCreated) {
        onNotesCreated([res.note]);
      }
    } catch (err) {
      showToast(err.message || 'Failed to save note.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      marginBottom: '32px',
      border: '1px solid var(--border-accent)',
      boxShadow: 'var(--shadow-lg)',
      animation: 'fadeIn 0.25s ease'
    }}>
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        paddingBottom: '18px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8'
          }}>
            <FileText size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Review Digitized Note (1 Complete Note)
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Full page transcribed into a single note. Review, adjust, or save directly.
            </p>
          </div>
        </div>

        {/* View Switchers & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm" 
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSaveNote}
            disabled={saving}
          >
            <Save size={16} />
            <span>{saving ? 'Saving Note...' : 'Save Note to Database'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout: Side-by-Side Review */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: imageUrl ? '1.1fr 0.9fr' : '1fr',
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Left Side: Plain Text Note Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Note Title:
            </label>
            <input
              type="text"
              className="input"
              style={{ fontSize: '1.1rem', fontWeight: 700 }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Exploratory Data Analysis"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Transcribed Plain-Text Note Content:
            </label>
            <textarea
              className="textarea"
              style={{
                minHeight: '360px',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.92rem',
                lineHeight: '1.7',
                padding: '16px'
              }}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Transcribed plain text content..."
            />
          </div>

          {/* Tags Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Tags (Press Enter to add):
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
                placeholder="Add tag..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  outline: 'none',
                  fontSize: '0.85rem',
                  minWidth: '90px',
                  flex: 1
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Untouched Original Photo */}
        {imageUrl && (
          <div style={{
            background: '#040711',
            padding: '16px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <ImageIcon size={16} color="var(--accent-secondary)" />
              <span>Original Photo (Untouched)</span>
            </div>
            
            <div style={{
              maxHeight: '440px',
              overflowY: 'auto',
              borderRadius: '8px',
              background: '#000000',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <img 
                src={imageUrl} 
                alt="Original Document" 
                style={{
                  maxWidth: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>

            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textAlign: 'center' }}>
              Stored untouched in SQLite metadata
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
