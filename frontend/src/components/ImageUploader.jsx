import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileImage, 
  Sparkles, 
  Check, 
  X, 
  Tag, 
  Info,
  Maximize2,
  FileText,
  Save,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

export default function ImageUploader({ onNoteCreated, showToast, onClose }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  // Extraction result state
  const [extractionResult, setExtractionResult] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    // Validate file type
    const validExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      showToast(`Invalid file type (${ext}). Please select an image.`, 'error');
      return;
    }

    // Max 25 MB
    if (file.size > 25 * 1024 * 1024) {
      showToast('File size is too large (max 25MB).', 'error');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setExtractionResult(null);
  };

  const handleProcessImage = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    try {
      const response = await api.uploadImage(selectedFile, { autoSave: false });
      const draft = response.draft;
      
      setExtractionResult(draft);
      setTitle(draft.title || selectedFile.name);
      setContent(draft.content || '');
      setExtractedText(draft.extracted_text || '');
      setTags(draft.tags || ['image-note']);
      
      showToast('Image metadata & notes extracted successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to process image.', 'error');
    } finally {
      setProcessing(false);
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

  const handleSaveNote = async () => {
    if (!title.trim()) {
      showToast('Please enter a note title.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        extracted_text: extractedText.trim(),
        image_filename: extractionResult.image_filename,
        image_path: extractionResult.image_url,
        image_metadata: extractionResult.image_metadata,
        tags: tags,
        is_favorite: false
      };

      const res = await api.createNote(payload);
      showToast('Note saved to SQLite database!', 'success');
      if (onNoteCreated) onNoteCreated(res.note);
      resetState();
      if (onClose) onClose();
    } catch (err) {
      showToast(err.message || 'Failed to save note.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setExtractionResult(null);
    setTitle('');
    setContent('');
    setExtractedText('');
    setTags([]);
    setTagInput('');
  };

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      marginBottom: '32px',
      border: '1px solid rgba(99, 102, 241, 0.25)',
      boxShadow: 'var(--shadow-md)',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={16} color="#ffffff" />
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Image Uploader & Note Extractor
          </h2>
        </div>

        {onClose && (
          <button 
            className="btn btn-ghost btn-icon" 
            onClick={onClose}
            title="Close Uploader"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {!extractionResult ? (
        /* Upload & Dropzone Step */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.15)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '36px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: dragActive ? 'rgba(99, 102, 241, 0.1)' : 'rgba(15, 23, 42, 0.5)',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />

            {previewUrl ? (
              <div style={{ position: 'relative', maxWidth: '300px', maxHeight: '200px' }}>
                <img 
                  src={previewUrl} 
                  alt="Selected Preview" 
                  style={{
                    maxWidth: '100%',
                    maxHeight: '180px',
                    borderRadius: '8px',
                    objectFit: 'contain',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                />
                <div style={{
                  marginTop: '8px',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                  fontWeight: 500
                }}>
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </div>
              </div>
            ) : (
              <>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                  boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)'
                }}>
                  <UploadCloud size={28} />
                </div>
                <div>
                  <p style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Drop your image here, or <span style={{ color: 'var(--accent-primary)' }}>browse</span>
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Supports PNG, JPG, JPEG, WEBP, GIF, BMP (up to 25MB)
                  </p>
                </div>
              </>
            )}
          </div>

          {selectedFile && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={resetState}
                disabled={processing}
              >
                Clear
              </button>
              <button
                className="btn btn-primary"
                onClick={handleProcessImage}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <span className="animate-pulse-subtle">Extracting Metadata & Text...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Extract & Create Note</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Review & Save Step */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(260px, 320px) 1fr',
            gap: '24px'
          }}>
            {/* Left: Image & Technical Metadata */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: '#090d16',
                border: '1px solid var(--border-subtle)',
                maxHeight: '260px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={previewUrl}
                  alt="Extracted file"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* Technical Metadata Card */}
              {extractionResult.image_metadata && (
                <div style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    📐 Extracted Metadata
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Dimensions:</span>
                    <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                      {extractionResult.image_metadata.width} × {extractionResult.image_metadata.height} px
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Aspect Ratio:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {extractionResult.image_metadata.aspect_ratio}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>Format / Mode:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {extractionResult.image_metadata.format} ({extractionResult.image_metadata.mode})
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span>File Size:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {extractionResult.image_metadata.file_size_human}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Editable Note Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Note Title
                </label>
                <input 
                  type="text"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter note title..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Extracted Note Content & Summary
                </label>
                <textarea
                  className="textarea"
                  style={{ minHeight: '140px' }}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Note body..."
                />
              </div>

              {/* Tags Editor */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Tags (Type and press Enter)
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
          </div>

          {/* Action Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: '16px'
          }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={resetState}
            >
              Cancel & Discard
            </button>

            <button
              className="btn btn-primary"
              onClick={handleSaveNote}
              disabled={saving}
            >
              {saving ? 'Saving to SQLite...' : (
                <>
                  <Save size={16} />
                  <span>Save Note to SQLite</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
