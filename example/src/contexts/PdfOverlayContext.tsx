import React, { createContext, useContext, useState, useEffect } from 'react';

interface PdfOverlayContextType {
  isOverlayEnabled: boolean;
  overlayIntensity: number;
  toggleOverlay: () => void;
  setOverlayIntensity: (intensity: number) => void;
}

const PdfOverlayContext = createContext<PdfOverlayContextType | undefined>(undefined);

interface PdfOverlayProviderProps {
  children: React.ReactNode;
}

// Predefined intensity levels
export const OVERLAY_INTENSITIES = {
  LIGHT: 0.2,
  MEDIUM: 0.3,
  STRONG: 0.5,
} as const;

export function PdfOverlayProvider({ children }: PdfOverlayProviderProps) {
  // Initialize state from localStorage
  const [isOverlayEnabled, setIsOverlayEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('pdf-overlay-enabled');
    return saved ? JSON.parse(saved) : false;
  });

  const [overlayIntensity, setOverlayIntensityState] = useState<number>(() => {
    const saved = localStorage.getItem('pdf-overlay-intensity');
    return saved ? parseFloat(saved) : OVERLAY_INTENSITIES.MEDIUM;
  });

  // Apply overlay CSS custom property when values change
  useEffect(() => {
    const root = document.documentElement;
    
    if (isOverlayEnabled) {
      root.style.setProperty('--pdf-overlay-opacity', overlayIntensity.toString());
      root.style.setProperty('--pdf-overlay-display', 'block');
    } else {
      root.style.setProperty('--pdf-overlay-opacity', '0');
      root.style.setProperty('--pdf-overlay-display', 'none');
    }
  }, [isOverlayEnabled, overlayIntensity]);

  const toggleOverlay = () => {
    const newState = !isOverlayEnabled;
    setIsOverlayEnabled(newState);
    localStorage.setItem('pdf-overlay-enabled', JSON.stringify(newState));
  };

  const setOverlayIntensity = (intensity: number) => {
    // Clamp intensity between 0.1 and 0.7
    const clampedIntensity = Math.max(0.1, Math.min(0.7, intensity));
    setOverlayIntensityState(clampedIntensity);
    localStorage.setItem('pdf-overlay-intensity', clampedIntensity.toString());
  };

  const value = {
    isOverlayEnabled,
    overlayIntensity,
    toggleOverlay,
    setOverlayIntensity,
  };

  return (
    <PdfOverlayContext.Provider value={value}>
      {children}
    </PdfOverlayContext.Provider>
  );
}

export function usePdfOverlay() {
  const context = useContext(PdfOverlayContext);
  if (context === undefined) {
    throw new Error('usePdfOverlay must be used within a PdfOverlayProvider');
  }
  return context;
}