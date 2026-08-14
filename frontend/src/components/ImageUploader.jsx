import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Sparkles, 
  X, 
  FileText,
  Key,
  CheckCircle,
  AlertCircle
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
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            background: 'rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8'
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Transcribe Handwritten Notes to Plain Text
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Upload your notebook or paper photo — original picture is saved untouched
            </p>
          </div>
        </div>

        {onClose && (
          <button 
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* API Key Status Indicator */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        borderRadius: 'var(--radius-sm)',
        background: hasApiKey ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
        border: `1px solid ${hasApiKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
        marginBottom: '16px',
        fontSize: '0.82rem'
      }}>
        {hasApiKey ? (
          <>
            <CheckCircle size={15} color="#34d399" />
            <span style={{ color: '#a7f3d0' }}>
              <strong>Gemini Flash Vision Active:</strong> High-precision handwriting recognition ready.
            </span>
          </>
        ) : (
          <>
            <AlertCircle size={15} color="#f59e0b" />
            <span style={{ color: '#fde68a' }}>
              <strong>No Gemini Key Set:</strong> Using offline local OCR (may misread cursive). Click <strong>"Set Free Gemini Key"</strong> in the top navbar for 100% handwriting accuracy.
            </span>
          </>
        )}
      </div>

      {/* Drop Zone Area */}
      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(15, 23, 42, 0.4)',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
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
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(99, 102, 241, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#818cf8'
          }}>
            <UploadCloud size={24} />
          </div>
          <div>
            <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Drop your notebook photo here, or <span style={{ color: 'var(--accent-secondary)' }}>browse</span>
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Supports PNG, JPG, JPEG, WEBP (up to 25MB)
            </p>
          </div>
        </div>
      ) : (
        /* Selected File Preview */
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap'
          }}>
            <img 
              src={previewUrl} 
              alt="Preview" 
              style={{
                width: '70px',
                height: '70px',
                objectFit: 'cover',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)'
              }}
            />
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                {selectedFile.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for plain text transcription
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={resetState}
                disabled={processing}
              >
                Change Image
              </button>
              <button
                className="btn btn-primary"
                onClick={handleProcessImage}
                disabled={processing}
              >
                <Sparkles size={16} />
                <span>{processing ? 'Deciphering Handwriting...' : 'Transcribe to Plain Text'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
