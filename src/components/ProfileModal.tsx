'use client';

import React, { useState } from 'react';
import { User, X, Check, Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (newProfile: UserProfile) => Promise<void> | void;
}

// Helper to dynamically load PDF.js from CDN
const loadPdfJS = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is undefined'));
      return;
    }
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        resolve(pdfjsLib);
      } else {
        reject(new Error('PDF.js loaded but object not found on window'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF library from CDN'));
    document.head.appendChild(script);
  });
};

// Extract text from PDF ArrayBuffer
const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const pdfjs = await loadPdfJS();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
};

export default function ProfileModal({ isOpen, onClose, profile, onSave }: ProfileModalProps) {
  const [name, setName] = useState(profile.name);
  const [targetTitle, setTargetTitle] = useState(profile.targetTitle);
  const [skills, setSkills] = useState(profile.skills);
  const [experienceSummary, setExperienceSummary] = useState(profile.experienceSummary);
  const [resumeName, setResumeName] = useState(profile.resumeName || '');
  const [resumeData, setResumeData] = useState(profile.resumeData || '');
  const [resumeText, setResumeText] = useState(profile.resumeText || '');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Keep uploads small enough for comfortable local database reads/writes.
    if (file.size > 4 * 1024 * 1024) {
      setUploadError('File is too large. Please upload a file smaller than 4MB.');
      return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
      // 1. Read file as Data URL (base64) for download/storage
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file for storage'));
        reader.readAsDataURL(file);
      });

      // 2. Extract text content based on file type
      let extractedText = '';
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        extractedText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read text file'));
          reader.readAsText(file);
        });
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = () => reject(new Error('Failed to read PDF file'));
          reader.readAsArrayBuffer(file);
        });
        extractedText = await extractTextFromPdf(arrayBuffer);
      } else {
        throw new Error('Unsupported file type. Please upload a PDF, TXT, or Markdown file.');
      }

      setResumeName(file.name);
      setResumeData(dataUrl);
      setResumeText(extractedText);

      // Autofill experience summary if it's empty or short
      if (!experienceSummary.trim() || experienceSummary.length < 15) {
        setExperienceSummary(extractedText.slice(0, 500).trim() + (extractedText.length > 500 ? '...' : ''));
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Failed to parse file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = () => {
    if (!resumeData) return;
    const link = document.createElement('a');
    link.href = resumeData;
    link.download = resumeName || 'resume';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClearResume = () => {
    setResumeName('');
    setResumeData('');
    setResumeText('');
    setUploadError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name,
      targetTitle,
      skills,
      experienceSummary,
      resumeName: resumeName || undefined,
      resumeData: resumeData || undefined,
      resumeText: resumeText || undefined,
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="modal-overlay animate-fade-in" style={styles.overlay}>
      <div className="modal-content" style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <User size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="card-title">Professional Profile</h3>
          </div>
          <button onClick={onClose} className="button-tertiary" style={{ padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Target Job Title</label>
            <input
              type="text"
              value={targetTitle}
              onChange={(e) => setTargetTitle(e.target.value)}
              placeholder="e.g. Senior Java Spring Boot & React Developer"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Skills & Technologies (Comma Separated)</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. Java, Spring Boot, React, Angular, Gen AI, RLM integrations"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Resume Upload (.pdf, .txt, .md)</label>
            {resumeName ? (
              <div style={styles.resumeBox}>
                <div style={styles.resumeInfo}>
                  <FileText size={20} style={{ color: 'var(--color-primary)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                    <span style={styles.resumeFileName}>{resumeName}</span>
                    <span className="caption" style={{ color: 'var(--color-success)' }}>
                      Parsed successfully ({resumeText ? resumeText.split(/\s+/).filter(Boolean).length : 0} words)
                    </span>
                  </div>
                </div>
                <div style={styles.resumeActions}>
                  <button type="button" onClick={handleDownload} className="button-secondary" style={{ padding: '4px 8px', height: '28px' }} title="Download file">
                    <Download size={14} />
                  </button>
                  <button type="button" onClick={handleClearResume} className="button-danger" style={{ padding: '4px 8px', height: '28px' }} title="Remove file">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.uploadArea}>
                {isUploading ? (
                  <div style={styles.uploadingBox}>
                    <Loader2 size={20} className="spin" style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '13px' }}>Parsing resume content...</span>
                  </div>
                ) : (
                  <label style={styles.uploadLabel}>
                    <Upload size={20} style={{ color: 'var(--color-ink-subtle)', marginBottom: '8px' }} />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Upload Resume</span>
                    <span className="caption" style={{ marginTop: '2px' }}>PDF, TXT, or Markdown up to 4MB</span>
                    <input
                      type="file"
                      accept=".pdf,.txt,.md"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
            )}
            {uploadError && (
              <span className="caption" style={{ color: 'var(--color-danger)', marginTop: '4px' }}>
                {uploadError}
              </span>
            )}
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Professional Summary / Base Resume Info</label>
            <textarea
              value={experienceSummary}
              onChange={(e) => setExperienceSummary(e.target.value)}
              placeholder="Describe your background, achievements, and technical expertise. The AI will use this as a reference to write cover letters and resume bullets."
              rows={6}
              required
              style={styles.textarea}
            />
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} className="button-secondary">
              Cancel
            </button>
            <button type="submit" className="button-primary" style={isSaved ? { backgroundColor: 'var(--color-success)' } : {}}>
              {isSaved ? (
                <>
                  <Check size={16} /> Saved!
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-lg) var(--spacing-md)',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: 'var(--color-surface-1)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-lg)',
    width: 'min(540px, 100%)',
    maxWidth: '540px',
    maxHeight: 'calc(100vh - 48px)',
    overflowY: 'auto',
    padding: 'var(--spacing-lg)',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-lg)',
    borderBottom: '1px solid var(--color-hairline)',
    paddingBottom: 'var(--spacing-sm)',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xxs)',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--color-ink-subtle)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  textarea: {
    resize: 'vertical',
  },
  actions: {
    position: 'sticky',
    bottom: 'calc(var(--spacing-lg) * -1)',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--spacing-sm)',
    marginTop: 'var(--spacing-sm)',
    borderTop: '1px solid var(--color-hairline)',
    paddingTop: 'var(--spacing-md)',
    paddingBottom: 'var(--spacing-lg)',
    backgroundColor: 'var(--color-surface-1)',
  },
  resumeBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-md)',
    padding: '10px 14px',
    marginTop: '4px',
  },
  resumeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    overflow: 'hidden',
  },
  resumeFileName: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--color-ink)',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    maxWidth: '260px',
  },
  resumeActions: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  uploadArea: {
    border: '1px dashed var(--color-hairline)',
    borderRadius: 'var(--rounded-md)',
    backgroundColor: 'var(--color-surface-1)',
    transition: 'all 0.15s ease',
    marginTop: '4px',
  },
  uploadLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    cursor: 'pointer',
    width: '100%',
  },
  uploadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    gap: '8px',
  },
};
