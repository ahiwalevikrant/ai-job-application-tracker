'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, DollarSign, ExternalLink, Sparkles, Copy, Check, FileText, CheckSquare, HelpCircle, Save, Trash2, Loader2 } from 'lucide-react';
import { AIProvider, JobCard, UserProfile, JobStatus } from '../types';
import { generateAIAction } from '../app/actions';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobCard;
  profile: UserProfile;
  aiApiKey: string;
  aiModel?: string;
  aiProvider?: AIProvider;
  onSaveJob: (updatedJob: JobCard) => void;
  onDeleteJob: (id: string) => void;
}

type TabType = 'description' | 'coverLetter' | 'resumeBullets' | 'interviewQuestions' | 'notes';

export default function JobDetailsModal({
  isOpen,
  onClose,
  job,
  profile,
  aiApiKey,
  aiModel,
  aiProvider,
  onSaveJob,
  onDeleteJob,
}: JobDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('description');
  const [notes, setNotes] = useState(job.notes || '');
  const [status, setStatus] = useState<JobStatus>(job.status);
  
  // AI Generation States
  const [coverLetter, setCoverLetter] = useState(job.coverLetter || '');
  const [resumeBullets, setResumeBullets] = useState(job.resumeBullets || '');
  const [interviewQuestions, setInterviewQuestions] = useState(job.interviewQuestions || '');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Reset states when job changes
    if (job) {
      setNotes(job.notes || '');
      setStatus(job.status);
      setCoverLetter(job.coverLetter || '');
      setResumeBullets(job.resumeBullets || '');
      setInterviewQuestions(job.interviewQuestions || '');
      setActiveTab('description');
      setError('');
    }
  }, [job]);

  if (!isOpen) return null;

  const handleStatusChange = (newStatus: JobStatus) => {
    setStatus(newStatus);
    onSaveJob({ ...job, status: newStatus });
  };

  const handleSaveNotes = () => {
    onSaveJob({ ...job, notes });
  };

  const handleGenerate = async (type: 'cover_letter' | 'resume_bullets' | 'interview_questions') => {
    setLoading(true);
    setError('');
    try {
      const result = await generateAIAction(
        type,
        {
          title: job.title,
          company: job.company,
          description: job.description,
          salary: job.salary,
          location: job.location,
        },
        profile,
        aiApiKey,
        aiModel,
        aiProvider
      );

      if (result.success && result.text) {
        const generatedText = result.text;
        
        // Save locally and update state
        let updatedJob = { ...job };
        if (type === 'cover_letter') {
          setCoverLetter(generatedText);
          updatedJob.coverLetter = generatedText;
        } else if (type === 'resume_bullets') {
          setResumeBullets(generatedText);
          updatedJob.resumeBullets = generatedText;
        } else if (type === 'interview_questions') {
          setInterviewQuestions(generatedText);
          updatedJob.interviewQuestions = generatedText;
        }
        
        onSaveJob(updatedJob);
      } else {
        setError(result.error || 'Failed to generate AI materials.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during AI generation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${job.title} at ${job.company}?`)) {
      onDeleteJob(job.id);
      onClose();
    }
  };

  // Simple Markdown parser
  const parseMarkdown = (md: string) => {
    if (!md) return '';
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^### (.*$)/gim, '<h4 style="margin-top: 16px; margin-bottom: 8px; color: var(--color-ink); font-size: 15px;">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 style="margin-top: 20px; margin-bottom: 10px; color: var(--color-ink); font-size: 17px; border-bottom: 1px solid var(--color-hairline); padding-bottom: 4px;">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 style="margin-top: 24px; margin-bottom: 12px; color: var(--color-ink); font-size: 20px;">$1</h2>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--color-ink);">$1</strong>');

    // Bullet points
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 6px; list-style-type: square;">$1</li>');

    // Paragraph breaks
    html = html.split('\n').map(line => {
      if (line.trim().startsWith('<h') || line.trim().startsWith('<li') || line.trim() === '') {
        return line;
      }
      return `<p style="margin-bottom: 12px; line-height: 1.6;">${line}</p>`;
    }).join('\n');

    return html;
  };

  const activeContent = () => {
    if (loading) {
      return (
        <div style={styles.loadingContainer}>
          <Loader2 size={24} className="spin" style={{ color: 'var(--color-primary)' }} />
          <p style={{ marginTop: 12 }}>Generating tailored materials...</p>
          <p className="caption" style={{ marginTop: 4 }}>{aiModel || (aiProvider === 'groq' ? 'llama-3.3-70b-versatile' : 'google/gemini-2.5-flash')}</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'description':
        return (
          <div style={styles.tabContentPane}>
            <h4 style={styles.sectionHeading}>Job Description</h4>
            {job.description ? (
              <div 
                dangerouslySetInnerHTML={{ __html: parseMarkdown(job.description) }}
                style={styles.markdownView}
              />
            ) : (
              <p style={{ color: 'var(--color-ink-subtle)' }}>No description provided.</p>
            )}
          </div>
        );
      case 'coverLetter':
        return (
          <div style={styles.tabContentPane}>
            <div style={styles.paneActionsHeader}>
              <h4 style={styles.sectionHeading}>Tailored Cover Letter</h4>
              {coverLetter && (
                <button onClick={() => handleCopy(coverLetter)} className="button-secondary" style={{ padding: '6px 12px' }}>
                  {copied ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>
            
            {coverLetter ? (
              <div 
                dangerouslySetInnerHTML={{ __html: parseMarkdown(coverLetter) }}
                style={{ ...styles.markdownView, fontFamily: 'var(--font-family)' }}
              />
            ) : (
              <div style={styles.emptyGenerateBox}>
                <FileText size={32} style={{ color: 'var(--color-ink-tertiary)', marginBottom: 12 }} />
                <p style={{ marginBottom: 16, textAlign: 'center' }}>
                  Produce a professional cover letter specifically tailored for this position using your profile details.
                </p>
                <button onClick={() => handleGenerate('cover_letter')} className="button-primary">
                  <Sparkles size={14} /> Generate Cover Letter
                </button>
              </div>
            )}

            {coverLetter && (
              <div style={styles.regenerateRow}>
                <button onClick={() => handleGenerate('cover_letter')} className="button-secondary">
                  <Sparkles size={14} /> Re-generate
                </button>
              </div>
            )}
          </div>
        );
      case 'resumeBullets':
        return (
          <div style={styles.tabContentPane}>
            <div style={styles.paneActionsHeader}>
              <h4 style={styles.sectionHeading}>Tailored Resume Bullet Points</h4>
              {resumeBullets && (
                <button onClick={() => handleCopy(resumeBullets)} className="button-secondary" style={{ padding: '6px 12px' }}>
                  {copied ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            {resumeBullets ? (
              <div 
                dangerouslySetInnerHTML={{ __html: parseMarkdown(resumeBullets) }}
                style={styles.markdownView}
              />
            ) : (
              <div style={styles.emptyGenerateBox}>
                <CheckSquare size={32} style={{ color: 'var(--color-ink-tertiary)', marginBottom: 12 }} />
                <p style={{ marginBottom: 16, textAlign: 'center' }}>
                  Get 3-5 custom resume bullet points highlighting your Spring Boot, React, and Gen AI skills mapping to this job description.
                </p>
                <button onClick={() => handleGenerate('resume_bullets')} className="button-primary">
                  <Sparkles size={14} /> Generate Resume Bullets
                </button>
              </div>
            )}

            {resumeBullets && (
              <div style={styles.regenerateRow}>
                <button onClick={() => handleGenerate('resume_bullets')} className="button-secondary">
                  <Sparkles size={14} /> Re-generate
                </button>
              </div>
            )}
          </div>
        );
      case 'interviewQuestions':
        return (
          <div style={styles.tabContentPane}>
            <div style={styles.paneActionsHeader}>
              <h4 style={styles.sectionHeading}>Likely Interview Questions</h4>
              {interviewQuestions && (
                <button onClick={() => handleCopy(interviewQuestions)} className="button-secondary" style={{ padding: '6px 12px' }}>
                  {copied ? <Check size={14} style={{ color: 'var(--color-success)' }} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            {interviewQuestions ? (
              <div 
                dangerouslySetInnerHTML={{ __html: parseMarkdown(interviewQuestions) }}
                style={styles.markdownView}
              />
            ) : (
              <div style={styles.emptyGenerateBox}>
                <HelpCircle size={32} style={{ color: 'var(--color-ink-tertiary)', marginBottom: 12 }} />
                <p style={{ marginBottom: 16, textAlign: 'center' }}>
                  Prepare for the interview with 5 highly likely technical and behavioral questions tailored for this role, with candidate talking points.
                </p>
                <button onClick={() => handleGenerate('interview_questions')} className="button-primary">
                  <Sparkles size={14} /> Generate Questions
                </button>
              </div>
            )}

            {interviewQuestions && (
              <div style={styles.regenerateRow}>
                <button onClick={() => handleGenerate('interview_questions')} className="button-secondary">
                  <Sparkles size={14} /> Re-generate
                </button>
              </div>
            )}
          </div>
        );
      case 'notes':
        return (
          <div style={styles.tabContentPane}>
            <h4 style={styles.sectionHeading}>Personal Tracking Notes</h4>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write application notes here... (e.g. interviewer names, follow up timeline, referrers)"
              rows={8}
              style={{ ...styles.textarea, marginBottom: 'var(--spacing-md)' }}
            />
            <button onClick={handleSaveNotes} className="button-primary" style={{ alignSelf: 'flex-start' }}>
              <Save size={14} /> Save Notes
            </button>
          </div>
        );
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" style={styles.overlay}>
      <div className="modal-content" style={styles.modal}>
        {/* Top Header Row */}
        <div style={styles.header}>
          <div>
            <span style={styles.companyBadge}>{job.company}</span>
            <h2 style={styles.title}>{job.title}</h2>
          </div>
          <div style={styles.headerRight}>
            <button onClick={handleDelete} className="button-danger" style={{ padding: '6px 12px' }} title="Delete Job">
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="button-tertiary" style={{ padding: 4 }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <span>{error}</span>
          </div>
        )}

        {/* Info Strip */}
        <div style={styles.infoStrip}>
          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Status</span>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as JobStatus)}
              style={styles.statusSelect}
            >
              <option value="wishlist">Wishlist</option>
              <option value="applied">Applied</option>
              <option value="interviewing">Interviewing</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {job.location && (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Location</span>
              <div style={styles.infoValue}>
                <MapPin size={12} style={{ marginRight: 4 }} />
                {job.location}
              </div>
            </div>
          )}

          {job.salary && (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Salary</span>
              <div style={styles.infoValue}>
                <DollarSign size={12} style={{ marginRight: 2 }} />
                {job.salary}
              </div>
            </div>
          )}

          <div style={styles.infoItem}>
            <span style={styles.infoLabel}>Added On</span>
            <div style={styles.infoValue}>
              <Calendar size={12} style={{ marginRight: 4 }} />
              {new Date(job.dateAdded).toLocaleDateString()}
            </div>
          </div>

          {job.url && (
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Job Link</span>
              <a href={job.url} target="_blank" rel="noopener noreferrer" style={styles.jobLink}>
                Visit Posting <ExternalLink size={10} style={{ marginLeft: 4 }} />
              </a>
            </div>
          )}
        </div>

        {/* Main Grid: Left Tabs, Right content */}
        <div style={styles.bodyGrid}>
          {/* Sidebar Tabs */}
          <div style={styles.sidebar}>
            <button
              onClick={() => setActiveTab('description')}
              style={{
                ...styles.tabButton,
                backgroundColor: activeTab === 'description' ? 'var(--color-surface-2)' : 'transparent',
                color: activeTab === 'description' ? 'var(--color-ink)' : 'var(--color-ink-subtle)',
                borderColor: activeTab === 'description' ? 'var(--color-primary)' : 'transparent',
              }}
            >
              Job Description
            </button>
            
            <button
              onClick={() => setActiveTab('coverLetter')}
              style={{
                ...styles.tabButton,
                backgroundColor: activeTab === 'coverLetter' ? 'var(--color-surface-2)' : 'transparent',
                color: activeTab === 'coverLetter' ? 'var(--color-ink)' : 'var(--color-ink-subtle)',
                borderColor: activeTab === 'coverLetter' ? 'var(--color-primary)' : 'transparent',
              }}
            >
              <Sparkles size={12} style={{ marginRight: 6, color: coverLetter ? 'var(--color-success)' : 'inherit' }} />
              Cover Letter
            </button>

            <button
              onClick={() => setActiveTab('resumeBullets')}
              style={{
                ...styles.tabButton,
                backgroundColor: activeTab === 'resumeBullets' ? 'var(--color-surface-2)' : 'transparent',
                color: activeTab === 'resumeBullets' ? 'var(--color-ink)' : 'var(--color-ink-subtle)',
                borderColor: activeTab === 'resumeBullets' ? 'var(--color-primary)' : 'transparent',
              }}
            >
              <Sparkles size={12} style={{ marginRight: 6, color: resumeBullets ? 'var(--color-success)' : 'inherit' }} />
              Resume Bullets
            </button>

            <button
              onClick={() => setActiveTab('interviewQuestions')}
              style={{
                ...styles.tabButton,
                backgroundColor: activeTab === 'interviewQuestions' ? 'var(--color-surface-2)' : 'transparent',
                color: activeTab === 'interviewQuestions' ? 'var(--color-ink)' : 'var(--color-ink-subtle)',
                borderColor: activeTab === 'interviewQuestions' ? 'var(--color-primary)' : 'transparent',
              }}
            >
              <Sparkles size={12} style={{ marginRight: 6, color: interviewQuestions ? 'var(--color-success)' : 'inherit' }} />
              Interview Prep
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              style={{
                ...styles.tabButton,
                backgroundColor: activeTab === 'notes' ? 'var(--color-surface-2)' : 'transparent',
                color: activeTab === 'notes' ? 'var(--color-ink)' : 'var(--color-ink-subtle)',
                borderColor: activeTab === 'notes' ? 'var(--color-primary)' : 'transparent',
              }}
            >
              Tracking Notes
            </button>
          </div>

          {/* Tab Content Display */}
          <div style={styles.contentArea}>
            {activeContent()}
          </div>
        </div>
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(6px)',
  },
  modal: {
    backgroundColor: 'var(--color-surface-1)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-lg)',
    width: '95%',
    maxWidth: '920px',
    height: '85vh',
    maxHeight: '800px',
    padding: 'var(--spacing-lg)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--color-hairline)',
    paddingBottom: 'var(--spacing-md)',
  },
  companyBadge: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--color-primary)',
    letterSpacing: '0.05em',
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    color: 'var(--color-ink)',
    marginTop: '2px',
  },
  headerRight: {
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
    marginTop: 'var(--spacing-md)',
  },
  infoStrip: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--spacing-xl)',
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-md)',
    padding: '12px var(--spacing-md)',
    marginTop: 'var(--spacing-md)',
    marginBottom: 'var(--spacing-md)',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--color-ink-subtle)',
    letterSpacing: '0.05em',
  },
  infoValue: {
    fontSize: '13px',
    color: 'var(--color-ink)',
    display: 'flex',
    alignItems: 'center',
  },
  statusSelect: {
    backgroundColor: 'var(--color-surface-3)',
    border: '1px solid var(--color-hairline)',
    padding: '2px 8px',
    height: '24px',
    borderRadius: 'var(--rounded-sm)',
    fontSize: '12px',
    color: 'var(--color-ink)',
    cursor: 'pointer',
    width: 'auto',
  },
  jobLink: {
    fontSize: '13px',
    color: 'var(--color-primary)',
    display: 'inline-flex',
    alignItems: 'center',
  },
  bodyGrid: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr',
    gap: 'var(--spacing-lg)',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    borderRight: '1px solid var(--color-hairline)',
    paddingRight: 'var(--spacing-md)',
    overflowY: 'auto',
  },
  tabButton: {
    textAlign: 'left',
    padding: '10px 12px',
    borderRadius: 'var(--rounded-md)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    borderLeft: '2px solid transparent',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  contentArea: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  tabContentPane: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  sectionHeading: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--color-ink)',
    marginBottom: 'var(--spacing-md)',
  },
  markdownView: {
    fontSize: '14px',
    color: 'var(--color-ink-muted)',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  emptyGenerateBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    border: '1px dashed var(--color-hairline)',
    borderRadius: 'var(--rounded-lg)',
    padding: 'var(--spacing-xl)',
    textAlign: 'center',
    backgroundColor: 'var(--color-surface-2)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  paneActionsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--spacing-md)',
  },
  regenerateRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginTop: 'var(--spacing-md)',
    borderTop: '1px solid var(--color-hairline)',
    paddingTop: 'var(--spacing-sm)',
  },
  textarea: {
    flex: 1,
    resize: 'none',
  },
};
