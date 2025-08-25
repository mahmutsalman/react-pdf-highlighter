import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Initialize theme from localStorage or default to light
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('pdf-library-theme');
    return (savedTheme as Theme) || 'light';
  });

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('theme-light', 'theme-dark');
    
    // Add current theme class
    root.classList.add(`theme-${theme}`);
    
    // Set CSS custom properties for theme colors
    if (theme === 'dark') {
      root.style.setProperty('--bg-primary', '#1a1a1a');
      root.style.setProperty('--bg-secondary', '#2d2d2d');
      root.style.setProperty('--bg-tertiary', '#3a3a3a');
      root.style.setProperty('--text-primary', '#ffffff');
      root.style.setProperty('--text-secondary', '#b3b3b3');
      root.style.setProperty('--text-tertiary', '#808080');
      root.style.setProperty('--border-primary', '#404040');
      root.style.setProperty('--border-secondary', '#2a2a2a');
      root.style.setProperty('--accent-color', '#0ea5e9');
      root.style.setProperty('--accent-hover', '#0284c7');
      root.style.setProperty('--danger-color', '#ef4444');
      root.style.setProperty('--danger-hover', '#dc2626');
      root.style.setProperty('--success-color', '#22c55e');
      root.style.setProperty('--warning-color', '#f59e0b');
      root.style.setProperty('--card-shadow', '0 4px 6px rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--card-shadow-hover', '0 8px 12px rgba(0, 0, 0, 0.4)');
    } else {
      root.style.setProperty('--bg-primary', '#ffffff');
      root.style.setProperty('--bg-secondary', '#f8f9fa');
      root.style.setProperty('--bg-tertiary', '#e9ecef');
      root.style.setProperty('--text-primary', '#212529');
      root.style.setProperty('--text-secondary', '#6c757d');
      root.style.setProperty('--text-tertiary', '#adb5bd');
      root.style.setProperty('--border-primary', '#dee2e6');
      root.style.setProperty('--border-secondary', '#e9ecef');
      root.style.setProperty('--accent-color', '#0ea5e9');
      root.style.setProperty('--accent-hover', '#0284c7');
      root.style.setProperty('--danger-color', '#dc3545');
      root.style.setProperty('--danger-hover', '#c82333');
      root.style.setProperty('--success-color', '#28a745');
      root.style.setProperty('--warning-color', '#ffc107');
      root.style.setProperty('--card-shadow', '0 2px 4px rgba(0, 0, 0, 0.1)');
      root.style.setProperty('--card-shadow-hover', '0 4px 8px rgba(0, 0, 0, 0.15)');
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('pdf-library-theme', newTheme);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}