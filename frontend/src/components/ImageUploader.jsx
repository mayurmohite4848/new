import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Sparkles, 
  X, 
  FileText,
  Key
} from 'lucide-react';
import MultiNoteSplitReview from './MultiNoteSplitReview';
import { api } from '../services/api';

export default function ImageUploader({ onNoteCreated, showToast, onClose }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [extractionDraft, setExtractionDraft] = useState(null);

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
    const validExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!validExtensions.includes(ext)) {
      showToast(`Invalid file type (${ext}). Please select an image.`, 'error');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showToast('File size is too large (max 25MB).', 'error');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setExtractionDraft(null);
  };

  const handleProcessImage = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    try {
      const response = await api.uploadImage(selectedFile, { autoSave: false });
      const draft = response.draft;
      
      setExtractionDraft(draft);
      const count = draft.segmented_notes ? draft.segmented_notes.length : 1;
      showToast(`Transcribed! Ready to review ${count} plain text note(s).`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to transcribe image.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setExtractionDraft(null);
  };

  const hasApiKey = !!localStorage.getItem('gemini_api_key');

  if (extractionDraft) {
    return (
      <MultiNoteSplitReview
        draftData={extractionDraft}
        onNotesCreated={(createdNotes) => {
          if (onNoteCreated) {
            createdNotes.forEach(n => onNoteCreated(n));
          }
          resetState();
          if (onClose) onClose();
        }}
        onCancel={resetState}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="glass-panel" style={{
      padding: '24px',
      marginBottom: '32px',
      border: '1px solid var(--border-accent)',
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
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={18} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Transcribe Photo into Plain Text Notes
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Upload handwritten pages, whiteboards, or documents to transcribe into clean plain text notes.
            </p>
          </div>
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

      {/* Upload Dropzone */}
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
                  Drop handwritten photo or document here, or <span style={{ color: 'var(--accent-primary)' }}>browse</span>
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  {hasApiKey ? '✨ Gemini Flash Vision active for high-accuracy plain text transcription' : 'Using local OCR engine (or set a free Gemini Key in top right for 99% accuracy)'}
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
                <span className="animate-pulse-subtle">Transcribing Handwriting into Plain Text...</span>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Transcribe to Plain Text</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
