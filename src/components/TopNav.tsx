'use client';

import React from 'react';
import { Briefcase, Settings, User, Plus, Key } from 'lucide-react';
import { AIProvider } from '../types';

interface TopNavProps {
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onOpenAddJob: () => void;
  hasApiKey: boolean;
  provider: AIProvider;
}

export default function TopNav({ onOpenSettings, onOpenProfile, onOpenAddJob, hasApiKey, provider }: TopNavProps) {
  const providerLabel = provider === 'groq' ? 'Groq' : 'OpenRouter';

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        {/* Brand Logo */}
        <div style={styles.brand}>
          <div style={styles.logoBox}>
            <Briefcase size={16} style={{ color: 'var(--color-on-primary)' }} />
          </div>
          <span style={styles.logoText}>JobPortal</span>
          <span className="eyebrow" style={styles.logoSubtext}>Vikrant</span>
        </div>

        {/* Navigation & Controls */}
        <div style={styles.controls}>
          {/* Status Badge */}
          <div
            style={{
              ...styles.statusBadge,
              backgroundColor: hasApiKey ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
              borderColor: hasApiKey ? 'rgba(39, 166, 68, 0.2)' : 'rgba(245, 166, 35, 0.2)',
            }}
          >
            <Key size={10} style={{ color: hasApiKey ? 'var(--color-success)' : 'var(--color-warning)', marginRight: 4 }} />
            <span style={{ color: hasApiKey ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {hasApiKey ? `${providerLabel} Connected` : `${providerLabel} Disconnected`}
            </span>
          </div>

          <button onClick={onOpenProfile} className="button-secondary" style={styles.navBtn}>
            <User size={14} />
            <span>Profile</span>
          </button>

          <button onClick={onOpenSettings} className="button-secondary" style={styles.navBtn}>
            <Settings size={14} />
            <span>Settings</span>
          </button>

          <button onClick={onOpenAddJob} className="button-primary" style={styles.addBtn}>
            <Plus size={14} />
            <span>Add Job</span>
          </button>
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    backgroundColor: 'rgba(15, 16, 17, 0.85)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-lg)',
    position: 'sticky',
    top: '16px',
    zIndex: 900,
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    width: 'calc(100% - 32px)',
    maxWidth: '1280px',
    margin: '16px auto 0 auto',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 var(--spacing-lg)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
  },
  logoBox: {
    width: '24px',
    height: '24px',
    borderRadius: 'var(--rounded-sm)',
    backgroundColor: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--color-ink)',
    letterSpacing: '-0.02em',
  },
  logoSubtext: {
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: 'var(--color-surface-2)',
    borderRadius: 'var(--rounded-xs)',
    color: 'var(--color-ink-subtle)',
    marginLeft: '4px',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: 'var(--rounded-pill)',
    border: '1px solid',
  },
  navBtn: {
    padding: '6px 12px',
    height: '32px',
  },
  addBtn: {
    padding: '6px 14px',
    height: '32px',
  },
};
