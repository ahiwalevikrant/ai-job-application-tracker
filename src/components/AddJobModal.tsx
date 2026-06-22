'use client';

import React, { useState } from 'react';
import { Plus, X, Globe, Sparkles, Loader2 } from 'lucide-react';
import { scrapeUrlAction } from '../app/actions';
import { AIProvider, JobCard, JobStatus } from '../types';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (job: Omit<JobCard, 'id' | 'dateAdded'>) => void;
  aiApiKey: string;
  aiModel?: string;
  aiProvider?: AIProvider;
}

export default function AddJobModal({ isOpen, onClose, onAdd, aiApiKey, aiModel, aiProvider }: AddJobModalProps) {
  const [url, setUrl] = useState('');
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [status, setStatus] = useState<JobStatus>('wishlist');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleScrape = async () => {
    if (!url) {
      setError('Please enter a job posting URL.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const result = await scrapeUrlAction(url, aiApiKey, aiModel, aiProvider);
      if (result.success && result.data) {
        const data = result.data;
        setCompany(data.company || '');
        setTitle(data.title || '');
        setDescription(data.description || '');
        setLocation(data.location || '');
        setSalary(data.salary || '');
      } else {
        setError(result.error || 'Failed to parse the job posting.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during import.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !title) {
      setError('Company Name and Job Title are required.');
      return;
    }

    onAdd({
      company,
      title,
      description,
      url: url || undefined,
      status,
      location: location || undefined,
      salary: salary || undefined,
    });

    // Reset and close
    setUrl('');
    setCompany('');
    setTitle('');
    setDescription('');
    setLocation('');
    setSalary('');
    setStatus('wishlist');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay animate-fade-in" style={styles.overlay}>
      <div className="modal-content" style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <Plus size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="card-title">Add Job Application</h3>
          </div>
          <button onClick={onClose} className="button-tertiary" style={{ padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <span>{error}</span>
          </div>
        )}

        {/* AI Scrape Tool */}
        <div style={styles.scrapeSection}>
          <label style={styles.label}>Smart Import from URL</label>
          <div style={styles.scrapeInputRow}>
            <div style={styles.urlInputWrapper}>
              <Globe size={16} style={styles.urlIcon} />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g. https://www.linkedin.com/jobs/view/..."
                style={styles.urlInput}
                disabled={loading}
              />
            </div>
            <button
              type="button"
              onClick={handleScrape}
              disabled={loading}
              className="button-primary"
              style={styles.scrapeButton}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="spin" /> Importing...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Import Details
                </>
              )}
            </button>
          </div>
          <p className="caption" style={{ marginTop: 6 }}>
            Imports Job Title, Company, Description & details using your connected AI provider.
          </p>
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or edit manually</span>
        </div>

        {/* Manual Edit Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.row}>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Company *</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google"
                required
              />
            </div>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Job Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Software Engineer - Spring Boot"
                required
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote / San Francisco, CA"
              />
            </div>
            <div style={{ ...styles.inputGroup, flex: 1 }}>
              <label style={styles.label}>Salary Range</label>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. $130,000 - $160,000"
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Pipeline Stage</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as JobStatus)}>
              <option value="wishlist">Wishlist</option>
              <option value="applied">Applied</option>
              <option value="interviewing">Interviewing</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Job Description (Markdown supported)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste job details, key requirements, or description here..."
              rows={5}
              style={styles.textarea}
            />
          </div>

          <div style={styles.actions}>
            <button type="button" onClick={onClose} className="button-secondary">
              Cancel
            </button>
            <button type="submit" className="button-primary" disabled={loading}>
              Add to Board
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
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: 'var(--color-surface-1)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-lg)',
    width: '100%',
    maxWidth: '640px',
    maxHeight: '90vh',
    padding: 'var(--spacing-lg)',
    overflowY: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-md)',
    borderBottom: '1px solid var(--color-hairline)',
    paddingBottom: 'var(--spacing-sm)',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
  },
  errorAlert: {
    backgroundColor: 'var(--color-danger-bg)',
    border: '1px solid rgba(226, 72, 72, 0.3)',
    borderRadius: 'var(--rounded-md)',
    padding: '10px 14px',
    color: 'var(--color-danger)',
    fontSize: '14px',
    marginBottom: 'var(--spacing-md)',
  },
  scrapeSection: {
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-lg)',
    padding: 'var(--spacing-md)',
    marginBottom: 'var(--spacing-md)',
  },
  scrapeInputRow: {
    display: 'flex',
    gap: 'var(--spacing-xs)',
    marginTop: 'var(--spacing-xxs)',
  },
  urlInputWrapper: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  urlIcon: {
    position: 'absolute',
    left: '12px',
    color: 'var(--color-ink-tertiary)',
  },
  urlInput: {
    paddingLeft: '36px',
    width: '100%',
  },
  scrapeButton: {
    flexShrink: 0,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    margin: 'var(--spacing-md) 0',
  },
  dividerText: {
    padding: '0 10px',
    color: 'var(--color-ink-tertiary)',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    width: '100%',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-md)',
  },
  row: {
    display: 'flex',
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
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 'var(--spacing-sm)',
    marginTop: 'var(--spacing-sm)',
    borderTop: '1px solid var(--color-hairline)',
    paddingTop: 'var(--spacing-md)',
  },
};
