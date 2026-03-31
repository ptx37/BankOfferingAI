import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../lib/useAppState';
import type { Lang } from '../lib/i18n';

const LANGS: { code: Lang; native: string }[] = [
  { code: 'en', native: 'English' },
  { code: 'de', native: 'Deutsch' },
  { code: 'ro', native: 'Română' },
];

interface TopBarControlsProps {
  onSignOut: () => void;
  signOutLabel?: string;
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

const iconBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 7,
  background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.10)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.80)',
  transition: 'background 0.15s',
  flexShrink: 0,
};

export default function TopBarControls({ onSignOut, signOutLabel = 'Sign out' }: TopBarControlsProps) {
  const { theme, toggleTheme, lang, setLang } = useAppState();
  const [langOpen, setLangOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
        style={iconBtn}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.20)')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)')}
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* Language switcher */}
      <div ref={dropRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setLangOpen(o => !o)}
          style={{
            ...iconBtn,
            width: 'auto',
            padding: '0 9px',
            gap: 5,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.03em',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.20)')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)')}
        >
          {lang.toUpperCase()}
          <ChevronDownIcon />
        </button>

        {langOpen && (
          <div style={{
            position: 'absolute',
            right: 0,
            top: 36,
            minWidth: 140,
            background: 'var(--color-background-primary)',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-dropdown)',
            zIndex: 200,
          }}>
            {LANGS.map((l, i) => {
              const isActive = lang === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setLangOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '9px 14px',
                    background: isActive ? 'var(--color-background-secondary)' : 'transparent',
                    borderTop: i > 0 ? '0.5px solid var(--color-border-tertiary)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: isActive ? 'var(--color-action)' : 'var(--color-text-primary)',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{l.code.toUpperCase()}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{l.native}</span>
                  {isActive && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.18)', margin: '0 2px' }} />

      {/* Sign out */}
      <button
        onClick={onSignOut}
        style={{
          color: 'rgba(255,255,255,0.60)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          padding: '0 2px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.90)')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.60)')}
      >
        {signOutLabel}
      </button>
    </div>
  );
}
