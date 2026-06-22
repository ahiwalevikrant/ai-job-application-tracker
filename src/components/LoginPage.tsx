'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, LogIn, SquareKanban } from 'lucide-react';
import { AuthUser } from '../types';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              theme: 'outline' | 'filled_blue' | 'filled_black';
              size: 'large' | 'medium' | 'small';
              shape: 'rectangular' | 'pill' | 'circle' | 'square';
              text: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              width?: number;
            }
          ) => void;
        };
      };
    };
    __jobPortalGoogleClientId?: string;
    __jobPortalGoogleCallback?: (response: { credential?: string }) => void;
  }
}

interface LoginPageProps {
  onSignIn: (user: AuthUser) => void;
}

function decodeJwtPayload(token: string) {
  const payload = token.split('.')[1];
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '='));
  return JSON.parse(decoded);
}

export default function LoginPage({ onSignIn }: LoginPageProps) {
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing-config' | 'error'>(
    clientId ? 'loading' : 'missing-config'
  );

  useEffect(() => {
    if (!clientId) {
      return;
    }

    const initializeGoogle = () => {
      if (!window.google || !googleButtonRef.current) {
        setStatus('error');
        return;
      }

      window.__jobPortalGoogleCallback = (response) => {
        if (!response.credential) {
          setStatus('error');
          return;
        }

        const payload = decodeJwtPayload(response.credential);
        onSignIn({
          id: payload.sub,
          name: payload.name || payload.given_name || payload.email,
          email: payload.email,
          picture: payload.picture,
        });
      };

      if (window.__jobPortalGoogleClientId !== clientId) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => window.__jobPortalGoogleCallback?.(response),
        });
        window.__jobPortalGoogleClientId = clientId;
      }

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'signin_with',
        width: 320,
      });
      setStatus('ready');
    };

    if (window.google) {
      initializeGoogle();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', initializeGoogle, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = () => setStatus('error');
    document.head.appendChild(script);
  }, [clientId, onSignIn]);

  return (
    <main style={styles.page}>
      <section style={styles.panel} className="animate-fade-in">
        <div style={styles.brandRow}>
          <div style={styles.logoBox}>
            <SquareKanban size={22} style={{ color: 'var(--color-primary-hover)' }} />
          </div>
          <div>
            <p className="eyebrow">JobPortal</p>
            <h1 className="headline" style={{ marginTop: 2 }}>Sign in to your pipeline</h1>
          </div>
        </div>

        <p className="subhead" style={styles.copy}>
          Use your Google account to open your personalized application tracker.
        </p>

        <div style={styles.googleBox}>
          <div ref={googleButtonRef} style={styles.googleButtonSlot} />
          {status === 'loading' && (
            <div style={styles.loadingRow}>
              <Loader2 size={16} className="spin" />
              <span>Loading Google sign-in...</span>
            </div>
          )}
          {status === 'missing-config' && (
            <div style={styles.notice}>
              <LogIn size={16} />
              <span>Add <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to <code>.env.local</code> to enable Google sign-in.</span>
            </div>
          )}
          {status === 'error' && (
            <div style={{ ...styles.notice, color: 'var(--color-danger)', borderColor: 'rgba(226, 72, 72, 0.25)', backgroundColor: 'var(--color-danger-bg)' }}>
              <LogIn size={16} />
              <span>Google sign-in could not be loaded. Check your client ID and network access.</span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: 'var(--color-canvas)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--spacing-lg)',
  },
  panel: {
    width: 'min(520px, 100%)',
    backgroundColor: 'var(--color-surface-1)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-lg)',
    padding: 'var(--spacing-xl)',
    boxShadow: '0 24px 70px rgba(0, 0, 0, 0.45)',
  },
  brandRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-md)',
    marginBottom: 'var(--spacing-md)',
  },
  logoBox: {
    width: '44px',
    height: '44px',
    borderRadius: 'var(--rounded-md)',
    backgroundColor: 'var(--color-surface-2)',
    border: '1px solid var(--color-hairline-strong)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    fontSize: '14px',
    marginBottom: 'var(--spacing-lg)',
  },
  googleBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-sm)',
  },
  googleButtonSlot: {
    minHeight: '44px',
  },
  loadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)',
    color: 'var(--color-ink-subtle)',
    fontSize: '13px',
  },
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--spacing-xs)',
    color: 'var(--color-warning)',
    backgroundColor: 'var(--color-warning-bg)',
    border: '1px solid rgba(245, 166, 35, 0.2)',
    borderRadius: 'var(--rounded-md)',
    padding: '10px 12px',
    fontSize: '13px',
  },
};
