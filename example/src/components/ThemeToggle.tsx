import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '48px',
        height: '48px',
        backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
        color: theme === 'dark' ? 'var(--accent-color)' : 'var(--text-primary)',
        border: `1px solid ${theme === 'dark' ? 'var(--accent-color)' : 'var(--border-primary)'}`,
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '16px',
        transition: 'all 0.2s ease',
        boxShadow: 'var(--card-shadow)',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (theme === 'light') {
          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
        }
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        if (theme === 'light') {
          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
        }
        e.currentTarget.style.transform = 'scale(1)';
      }}
      title={`UI Theme: ${theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}`}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}