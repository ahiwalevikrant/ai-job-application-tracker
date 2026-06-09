'use client';

import React, { useMemo, useState } from 'react';
import { BriefcaseBusiness, Check, ExternalLink, Loader2, MapPin, Search, Sparkles, X } from 'lucide-react';
import { searchJobsAction } from '../app/actions';
import { AIProvider, JobCard, JobSearchCriteria, JobSearchResult, UserProfile } from '../types';

interface JobSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  aiApiKey: string;
  aiModel?: string;
  aiProvider: AIProvider;
  openRouterApiKey: string;
  onAddJobs: (jobs: Array<Omit<JobCard, 'id' | 'dateAdded'>>) => Promise<void> | void;
}

const DEFAULT_CRITERIA: JobSearchCriteria = {
  targetRole: '',
  location: '',
  workMode: 'remote',
  salary: '',
  keywords: '',
  excludedCompanies: '',
  notes: '',
  askQuestionsFirst: false,
};

export default function JobSearchModal({
  isOpen,
  onClose,
  profile,
  aiApiKey,
  aiModel,
  aiProvider,
  openRouterApiKey,
  onAddJobs,
}: JobSearchModalProps) {
  const [criteria, setCriteria] = useState<JobSearchCriteria>(DEFAULT_CRITERIA);
  const [results, setResults] = useState<JobSearchResult[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedCount, setAddedCount] = useState(0);

  const selectedResults = useMemo(
    () => results.filter((result) => selectedIds.has(result.id)),
    [results, selectedIds]
  );

  if (!isOpen) return null;

  const updateCriteria = (key: keyof JobSearchCriteria, value: string | boolean) => {
    setCriteria((current) => ({ ...current, [key]: value }));
  };

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    setQuestions([]);
    setAddedCount(0);

    try {
      const result = await searchJobsAction(
        {
          ...criteria,
          targetRole: criteria.targetRole || profile.targetTitle,
          keywords: criteria.keywords || profile.skills,
        },
        profile,
        aiApiKey,
        aiModel,
        aiProvider,
        openRouterApiKey
      );

      if (result.success) {
        setResults(result.results);
        setQuestions(result.questions);
        setSelectedIds(new Set(result.results.map((item) => item.id)));
        if (result.warning) {
          setError(result.warning);
        }
      } else {
        setError(result.error || 'Unable to search live jobs.');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to search live jobs.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (selectedResults.length === 0) return;

    await onAddJobs(
      selectedResults.map((result) => ({
        company: result.company,
        title: result.title,
        description: [
          result.description,
          result.matchReason ? `\n\n**AI Match Reason**\n${result.matchReason}` : '',
          result.gaps ? `\n\n**Potential Gaps**\n${result.gaps}` : '',
          result.suggestedKeywords ? `\n\n**Suggested Resume Keywords**\n${result.suggestedKeywords}` : '',
        ].join(''),
        url: result.url || undefined,
        status: 'wishlist',
        location: result.location || undefined,
        salary: result.salary || undefined,
        notes: `Found by AI live job search. Match score: ${result.matchScore}/100${result.source ? ` (${result.source})` : ''}`,
      }))
    );

    setAddedCount(selectedResults.length);
    setSelectedIds(new Set());
  };

  return (
    <div className="modal-overlay animate-fade-in" style={styles.overlay}>
      <div className="modal-content" style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <Search size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="card-title">Live Job Search</h3>
          </div>
          <button onClick={onClose} className="button-tertiary" style={{ padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={styles.bodyGrid}>
          <section style={styles.searchPanel}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Target Role</label>
              <input
                value={criteria.targetRole}
                onChange={(e) => updateCriteria('targetRole', e.target.value)}
                placeholder={profile.targetTitle}
              />
            </div>

            <div style={styles.row}>
              <div style={{ ...styles.inputGroup, flex: 1 }}>
                <label style={styles.label}>Location</label>
                <input
                  value={criteria.location}
                  onChange={(e) => updateCriteria('location', e.target.value)}
                  placeholder="Remote, Dallas, Toronto..."
                />
              </div>
              <div style={{ ...styles.inputGroup, width: 140 }}>
                <label style={styles.label}>Mode</label>
                <select value={criteria.workMode} onChange={(e) => updateCriteria('workMode', e.target.value)}>
                  <option value="any">Any</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Salary Target</label>
              <input
                value={criteria.salary}
                onChange={(e) => updateCriteria('salary', e.target.value)}
                placeholder="e.g. $130k+, CAD 120k+, open"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Keywords</label>
              <input
                value={criteria.keywords}
                onChange={(e) => updateCriteria('keywords', e.target.value)}
                placeholder="Spring Boot, React, Angular, Gen AI..."
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Exclude</label>
              <input
                value={criteria.excludedCompanies}
                onChange={(e) => updateCriteria('excludedCompanies', e.target.value)}
                placeholder="Companies, domains, contract-only..."
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Questions / Tailoring Notes</label>
              <textarea
                value={criteria.notes}
                onChange={(e) => updateCriteria('notes', e.target.value)}
                rows={4}
                placeholder="Answer any questions here, or add preferences like visa sponsorship, industry, seniority, timezone..."
                style={styles.textarea}
              />
            </div>

            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={criteria.askQuestionsFirst}
                onChange={(e) => updateCriteria('askQuestionsFirst', e.target.checked)}
                style={{ width: 'auto' }}
              />
              Ask clarifying questions before searching
            </label>

            <button onClick={handleSearch} disabled={loading} className="button-primary" style={styles.searchButton}>
              {loading ? (
                <>
                  <Loader2 size={14} className="spin" /> Searching live jobs...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Search Jobs
                </>
              )}
            </button>
          </section>

          <section style={styles.resultsPanel}>
            {error && <div style={styles.errorAlert}>{error}</div>}

            {questions.length > 0 && (
              <div style={styles.questionsBox}>
                <h4 style={styles.sectionTitle}>Questions to tailor the search</h4>
                {questions.map((question) => (
                  <p key={question} className="body-sm" style={{ color: 'var(--color-ink-muted)' }}>{question}</p>
                ))}
              </div>
            )}

            <div style={styles.resultHeader}>
              <span className="caption">{results.length ? `${results.length} results` : 'No results yet'}</span>
              <button
                onClick={handleAddSelected}
                disabled={selectedResults.length === 0}
                className="button-secondary"
                style={styles.addButton}
              >
                <BriefcaseBusiness size={14} /> Add Selected ({selectedResults.length})
              </button>
            </div>

            {addedCount > 0 && (
              <div style={styles.successAlert}>
                <Check size={14} /> Added {addedCount} job{addedCount === 1 ? '' : 's'} to Wishlist.
              </div>
            )}

            <div style={styles.resultsList}>
              {results.length === 0 && !loading ? (
                <div style={styles.emptyState}>
                  <Search size={28} style={{ color: 'var(--color-ink-tertiary)', marginBottom: 10 }} />
                  <p className="caption">Search results will appear here with match scores and source links.</p>
                </div>
              ) : (
                results.map((result) => (
                  <article key={result.id} style={styles.resultCard}>
                    <div style={styles.resultTopRow}>
                      <label style={styles.resultSelect}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(result.id)}
                          onChange={() => toggleSelected(result.id)}
                          style={{ width: 'auto' }}
                        />
                        <span style={styles.scoreBadge}>{result.matchScore}/100</span>
                      </label>
                      {result.url && (
                        <a href={result.url} target="_blank" rel="noopener noreferrer" style={styles.sourceLink}>
                          Source <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <span style={styles.company}>{result.company}</span>
                    <h4 style={styles.resultTitle}>{result.title}</h4>
                    <div style={styles.metaRow}>
                      {result.location && (
                        <span style={styles.metaItem}><MapPin size={11} /> {result.location}</span>
                      )}
                      {result.salary && <span style={styles.metaItem}>{result.salary}</span>}
                    </div>
                    <p style={styles.description}>{result.description}</p>
                    {result.matchReason && <p style={styles.reason}>{result.matchReason}</p>}
                    {result.gaps && <p className="caption">Gaps: {result.gaps}</p>}
                    {result.suggestedKeywords && <p className="caption">Keywords: {result.suggestedKeywords}</p>}
                  </article>
                ))
              )}
            </div>
          </section>
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-lg)',
    zIndex: 1000,
    backdropFilter: 'blur(5px)',
  },
  modal: {
    width: 'min(1100px, 100%)',
    maxHeight: 'calc(100vh - 48px)',
    overflow: 'hidden',
    backgroundColor: 'var(--color-surface-1)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-lg)',
    padding: 'var(--spacing-lg)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid var(--color-hairline)',
    paddingBottom: 'var(--spacing-sm)',
    marginBottom: 'var(--spacing-md)',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
  },
  bodyGrid: {
    display: 'grid',
    gridTemplateColumns: '360px 1fr',
    gap: 'var(--spacing-lg)',
    minHeight: 0,
    overflow: 'hidden',
  },
  searchPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
    borderRight: '1px solid var(--color-hairline)',
    paddingRight: 'var(--spacing-lg)',
    overflowY: 'auto',
  },
  resultsPanel: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
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
  row: {
    display: 'flex',
    gap: 'var(--spacing-sm)',
  },
  textarea: {
    resize: 'vertical',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    fontSize: '13px',
    color: 'var(--color-ink-muted)',
  },
  searchButton: {
    marginTop: 'var(--spacing-xs)',
    width: '100%',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--spacing-sm)',
    marginBottom: 'var(--spacing-sm)',
  },
  addButton: {
    height: '32px',
    padding: '6px 10px',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
    overflowY: 'auto',
    paddingRight: '4px',
  },
  resultCard: {
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-md)',
    padding: 'var(--spacing-md)',
  },
  resultTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 'var(--spacing-xs)',
  },
  resultSelect: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
  },
  scoreBadge: {
    fontSize: '11px',
    color: 'var(--color-success)',
    backgroundColor: 'var(--color-success-bg)',
    border: '1px solid rgba(39, 166, 68, 0.2)',
    borderRadius: 'var(--rounded-pill)',
    padding: '2px 7px',
  },
  sourceLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--color-primary)',
  },
  company: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-primary)',
  },
  resultTitle: {
    fontSize: '16px',
    marginTop: '2px',
    marginBottom: 'var(--spacing-xs)',
  },
  metaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--spacing-xs)',
    marginBottom: 'var(--spacing-xs)',
  },
  metaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: 'var(--color-ink-subtle)',
    backgroundColor: 'var(--color-surface-3)',
    borderRadius: 'var(--rounded-sm)',
    padding: '2px 6px',
  },
  description: {
    fontSize: '13px',
    color: 'var(--color-ink-muted)',
    lineHeight: 1.5,
    marginBottom: 'var(--spacing-xs)',
  },
  reason: {
    fontSize: '13px',
    color: 'var(--color-ink)',
    lineHeight: 1.5,
    marginBottom: 'var(--spacing-xs)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '260px',
    border: '1px dashed var(--color-hairline)',
    borderRadius: 'var(--rounded-md)',
    textAlign: 'center',
    padding: 'var(--spacing-xl)',
  },
  questionsBox: {
    border: '1px solid rgba(245, 166, 35, 0.25)',
    backgroundColor: 'var(--color-warning-bg)',
    borderRadius: 'var(--rounded-md)',
    padding: 'var(--spacing-md)',
    marginBottom: 'var(--spacing-sm)',
  },
  sectionTitle: {
    fontSize: '14px',
    marginBottom: 'var(--spacing-xs)',
  },
  errorAlert: {
    backgroundColor: 'var(--color-danger-bg)',
    border: '1px solid rgba(226, 72, 72, 0.3)',
    borderRadius: 'var(--rounded-md)',
    padding: '10px 14px',
    color: 'var(--color-danger)',
    fontSize: '14px',
    marginBottom: 'var(--spacing-sm)',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    backgroundColor: 'var(--color-success-bg)',
    border: '1px solid rgba(39, 166, 68, 0.2)',
    borderRadius: 'var(--rounded-md)',
    padding: '8px 12px',
    color: 'var(--color-success)',
    fontSize: '13px',
    marginBottom: 'var(--spacing-sm)',
  },
};
