'use client';

import React, { useState } from 'react';
import { Calendar, MapPin, DollarSign, ExternalLink, ArrowRight, MessageSquareCode } from 'lucide-react';
import { JobCard, JobStatus } from '../types';

interface BoardProps {
  jobs: JobCard[];
  onMoveJob: (id: string, newStatus: JobStatus) => void;
  onCardClick: (job: JobCard) => void;
}

const COLUMNS: { id: JobStatus; title: string; color: string }[] = [
  { id: 'wishlist', title: 'Wishlist', color: '#8a8f98' },
  { id: 'applied', title: 'Applied', color: '#5e6ad2' },
  { id: 'interviewing', title: 'Interviewing', color: '#f5a623' },
  { id: 'offer', title: 'Offer', color: '#27a644' },
  { id: 'rejected', title: 'Rejected', color: '#e24848' },
];

export default function Board({ jobs, onMoveJob, onCardClick }: BoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<JobStatus | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: JobStatus) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, status: JobStatus) => {
    e.preventDefault();
    setDragOverColumn(status);
  };

  const handleDragLeave = (status: JobStatus) => {
    if (dragOverColumn === status) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, status: JobStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const jobId = e.dataTransfer.getData('text/plain');
    if (jobId) {
      onMoveJob(jobId, status);
    }
  };

  // Helper to format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <div style={styles.boardContainer}>
      {COLUMNS.map((col) => {
        const columnJobs = jobs.filter((j) => j.status === col.id);
        const isDraggingOver = dragOverColumn === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragEnter={(e) => handleDragEnter(e, col.id)}
            onDragLeave={() => handleDragLeave(col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            style={{
              ...styles.column,
              backgroundColor: isDraggingOver ? 'var(--color-surface-2)' : 'var(--color-surface-1)',
              borderColor: isDraggingOver ? 'var(--color-primary)' : 'var(--color-hairline)',
            }}
          >
            <div style={styles.columnHeader}>
              <div style={styles.columnTitleWrapper}>
                <span style={{ ...styles.columnIndicator, backgroundColor: col.color }} />
                <h4 style={styles.columnTitle}>{col.title}</h4>
              </div>
              <span style={styles.badge}>{columnJobs.length}</span>
            </div>

            <div style={styles.cardsContainer}>
              {columnJobs.length === 0 ? (
                <div style={styles.emptyState}>
                  <p className="caption">No jobs here</p>
                </div>
              ) : (
                columnJobs.map((job) => (
                  <div
                    key={job.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, job.id)}
                    onClick={() => onCardClick(job)}
                    style={styles.card}
                    className="animate-fade-in"
                  >
                    <div style={styles.cardHeader}>
                      <span style={styles.companyName}>{job.company}</span>
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={styles.linkIcon}
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                    <h5 style={styles.cardTitle}>{job.title}</h5>

                    {/* Metadata tags */}
                    <div style={styles.metaTags}>
                      {job.location && (
                        <span style={styles.tag}>
                          <MapPin size={10} style={{ marginRight: 2 }} />
                          {job.location}
                        </span>
                      )}
                      {job.salary && (
                        <span style={styles.tag}>
                          <DollarSign size={10} style={{ marginRight: 2 }} />
                          {job.salary}
                        </span>
                      )}
                    </div>

                    <div style={styles.cardFooter}>
                      <span style={styles.date}>
                        <Calendar size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {formatDate(job.dateAdded)}
                      </span>
                      
                      {/* AI material indicator */}
                      {(job.coverLetter || job.resumeBullets || job.interviewQuestions) && (
                        <span style={styles.aiBadge} title="AI content generated">
                          <MessageSquareCode size={10} style={{ marginRight: 2 }} />
                          AI
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  boardContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(200px, 1fr))',
    gap: 'var(--spacing-md)',
    height: 'calc(100vh - 180px)',
    minHeight: '500px',
    overflowX: 'auto',
    paddingBottom: 'var(--spacing-md)',
    alignItems: 'stretch',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-lg)',
    padding: 'var(--spacing-sm)',
    transition: 'all 0.15s ease',
    minWidth: '220px',
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-md)',
    paddingBottom: 'var(--spacing-xs)',
    borderBottom: '1px solid var(--color-hairline)',
  },
  columnTitleWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
  },
  columnIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  columnTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-ink)',
  },
  badge: {
    fontSize: '11px',
    fontWeight: 500,
    backgroundColor: 'var(--color-surface-3)',
    color: 'var(--color-ink-subtle)',
    padding: '2px 6px',
    borderRadius: 'var(--rounded-pill)',
  },
  cardsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
    flex: 1,
    overflowY: 'auto',
    paddingRight: '2px',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100px',
    border: '1px dashed var(--color-hairline)',
    borderRadius: 'var(--rounded-md)',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-md)',
    padding: 'var(--spacing-md)',
    cursor: 'grab',
    transition: 'all 0.15s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'var(--spacing-xxs)',
  },
  companyName: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--color-primary)',
  },
  linkIcon: {
    color: 'var(--color-ink-tertiary)',
    cursor: 'pointer',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--color-ink)',
    marginBottom: 'var(--spacing-xs)',
    lineHeight: '1.3',
  },
  metaTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--spacing-xxs)',
    marginBottom: 'var(--spacing-sm)',
  },
  tag: {
    fontSize: '10px',
    color: 'var(--color-ink-subtle)',
    backgroundColor: 'var(--color-surface-3)',
    padding: '2px 6px',
    borderRadius: 'var(--rounded-sm)',
    display: 'inline-flex',
    alignItems: 'center',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--color-hairline)',
    paddingTop: 'var(--spacing-xs)',
    marginTop: 'var(--spacing-xs)',
  },
  date: {
    fontSize: '10px',
    color: 'var(--color-ink-tertiary)',
  },
  aiBadge: {
    fontSize: '9px',
    fontWeight: 600,
    color: 'var(--color-success)',
    backgroundColor: 'var(--color-success-bg)',
    padding: '1px 5px',
    borderRadius: 'var(--rounded-sm)',
    display: 'inline-flex',
    alignItems: 'center',
  },
};
