import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Sparkles, 
  X, 
  Layers, 
  FileText, 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  BookOpen,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#f43f5e'  // Rose
];

export default function NotebookBatchUploader({ onNotebookCreated, onClose, showToast }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [subjectTag, setSubjectTag] = useState('Data Science');
  const [description, setDescription] = useState('');
  const [coverColor, setCoverColor] = useState('#6366f1');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      appendFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      appendFiles(Array.from(e.target.files));
    }
  };

  const appendFiles = (newFiles) => {
    const valid = newFiles.filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ['png', 'jpg', 'jpeg', 'webp', 'pdf'].includes(ext);
    });

    if (valid.length < newFiles.length) {
      showToast('Some unsupported files were skipped (only images & PDFs supported).', 'info');
    }

    const filesWithPreviews = valid.map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2),
      previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      isPdf: file.name.toLowerCase().endsWith('.pdf')
    }));

    setSelectedFiles(prev => [...prev, ...filesWithPreviews]);

    if (!title && valid.length > 0) {
      const clean = valid[0].name.split('.')[0].replace(/[_\-]+/g, ' ').trim();
      setTitle(`${clean.charAt(0).toUpperCase() + clean.slice(1)} Notebook`);
    }
  };

  const handleRemoveFile = (id) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const moveFile = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= selectedFiles.length) return;
    const reordered = [...selectedFiles];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIdx, 0, moved);
    setSelectedFiles(reordered);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      showToast('Please select at least 1 image or PDF page.', 'error');
      return;
    }
    if (!title.trim()) {
      showToast('Please enter a title for your notebook.', 'error');
      return;
    }

    setUploading(true);
    try {
      const rawFiles = selectedFiles.map(f => f.file);
      const res = await api.uploadNotebookBatch(rawFiles, {
        title: title.trim(),
        description: description.trim(),
        subject_tag: subjectTag.trim() || 'General',
        cover_color: coverColor
      });

      showToast(`Notebook "${res.notebook.title}" created with ${res.notebook.pages?.length || selectedFiles.length} page(s)!`, 'success');
      if (onNotebookCreated) onNotebookCreated(res.notebook);
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to create multi-page notebook.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '820px', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.95)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={22} color="#818cf8" />
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Create Multi-Page Notebook
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Upload multiple handwritten pages or a scanned PDF to build a complete digital notebook
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} disabled={uploading}>
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Metadata Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Notebook Title *
              </label>
              <input
                type="text"
                className="input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Exploratory Data Analysis & Statistics"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Subject / Category
              </label>
              <input
                type="text"
                className="input"
                value={subjectTag}
                onChange={e => setSubjectTag(e.target.value)}
                placeholder="e.g. Machine Learning, Physics"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Description (Optional)
              </label>
              <input
                type="text"
                className="input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief summary or lecture chapter description..."
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Cover Accent Color
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', height: '42px' }}>
                {PRESET_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setCoverColor(c)}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: c,
                      cursor: 'pointer',
                      border: coverColor === c ? '2px solid #ffffff' : '2px solid transparent',
                      transform: coverColor === c ? 'scale(1.15)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Drag & Drop Multi-Image Area */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Upload Pages ({selectedFiles.length} Selected)
            </label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(15, 23, 42, 0.4)',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <UploadCloud size={30} color="#818cf8" />
              <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                Drop multiple handwritten photos here, or <span style={{ color: 'var(--accent-secondary)' }}>browse</span>
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Select all pages at once or a scanned PDF. Pages can be rearranged below.
              </p>
            </div>
          </div>

          {/* Selected Pages Thumbnail Filmstrip */}
          {selectedFiles.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Page Order & Previews:
                </span>
                <button 
                  type="button" 
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#f87171', fontSize: '0.75rem' }}
                  onClick={() => setSelectedFiles([])}
                >
                  Clear All
                </button>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '12px',
                maxHeight: '220px',
                overflowY: 'auto',
                padding: '8px',
                background: 'rgba(15, 23, 42, 0.5)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                {selectedFiles.map((item, idx) => (
                  <div 
                    key={item.id}
                    style={{
                      background: 'rgba(30, 41, 59, 0.8)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      border: '1px solid var(--border-subtle)',
                      position: 'relative'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)'
                    }}>
                      <span>Page {idx + 1}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveFile(item.id)}
                        style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}
                      >
                        <X size={13} />
                      </button>
                    </div>

                    {item.previewUrl ? (
                      <img 
                        src={item.previewUrl} 
                        alt={`Page ${idx + 1}`} 
                        style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      <div style={{
                        height: '80px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        borderRadius: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        color: 'var(--accent-secondary)'
                      }}>
                        <FileText size={24} />
                        <span style={{ fontSize: '0.65rem' }}>PDF Page</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '2px' }}>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveFile(idx, -1)}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', borderRadius: '3px', cursor: 'pointer', padding: '2px 6px' }}
                        title="Move Page Left"
                      >
                        <ArrowLeft size={11} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === selectedFiles.length - 1}
                        onClick={() => moveFile(idx, 1)}
                        style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ffffff', borderRadius: '3px', cursor: 'pointer', padding: '2px 6px' }}
                        title="Move Page Right"
                      >
                        <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '16px'
          }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={uploading || selectedFiles.length === 0}
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Transcribing Notebook Pages ({selectedFiles.length} pages)...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Create Notebook ({selectedFiles.length} Pages)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
