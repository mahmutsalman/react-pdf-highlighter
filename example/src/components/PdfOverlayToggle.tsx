import React, { useState } from 'react';
import { usePdfOverlay, OVERLAY_INTENSITIES } from '../contexts/PdfOverlayContext';
import { useTheme } from '../contexts/ThemeContext';

export function PdfOverlayToggle() {
  const { isOverlayEnabled, overlayIntensity, toggleOverlay, setOverlayIntensity } = usePdfOverlay();
  const { theme, toggleTheme } = useTheme();
  const [showIntensitySlider, setShowIntensitySlider] = useState(false);

  const handleToggle = () => {
    const wasEnabled = isOverlayEnabled;
    toggleOverlay();
    
    // Smart dark mode activation: when enabling PDF overlay and UI is in light mode
    if (!wasEnabled && theme === 'light') {
      toggleTheme(); // Auto-enable dark mode for consistent night reading experience
    }
    
    // Auto-show intensity slider when enabling
    if (!wasEnabled) {
      setShowIntensitySlider(true);
      // Auto-hide after 3 seconds
      setTimeout(() => setShowIntensitySlider(false), 3000);
    }
  };

  const handleIntensityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    setOverlayIntensity(value);
  };

  const handlePresetIntensity = (intensity: number) => {
    setOverlayIntensity(intensity);
  };

  const getIntensityLabel = () => {
    if (overlayIntensity <= 0.25) return 'Light';
    if (overlayIntensity <= 0.35) return 'Medium';
    if (overlayIntensity <= 0.55) return 'Strong';
    return 'Custom';
  };

  return (
    <div style={{ marginBottom: '1rem', position: 'relative' }}>
      {/* Main Toggle Button */}
      <button
        onClick={handleToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0.75rem',
          backgroundColor: isOverlayEnabled ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-secondary)',
          color: isOverlayEnabled ? 'var(--accent-color)' : 'var(--text-primary)',
          border: `1px solid ${isOverlayEnabled ? 'var(--accent-color)' : 'var(--border-primary)'}`,
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (!isOverlayEnabled) {
            e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOverlayEnabled) {
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
          }
        }}
        title={`${isOverlayEnabled ? 'Disable' : 'Enable'} PDF dark overlay for comfortable night reading`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>
            {isOverlayEnabled ? '🌙' : '☀️'}
          </span>
          <span>PDF Dark Overlay</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isOverlayEnabled && (
            <span style={{ 
              fontSize: '12px', 
              color: 'var(--text-secondary)',
              fontWeight: '400'
            }}>
              {getIntensityLabel()}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowIntensitySlider(!showIntensitySlider);
            }}
            disabled={!isOverlayEnabled}
            style={{
              background: 'none',
              border: 'none',
              color: isOverlayEnabled ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              cursor: isOverlayEnabled ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              padding: '2px',
              borderRadius: '2px',
              transition: 'color 0.2s ease',
            }}
            title="Adjust overlay intensity"
          >
            ⚙️
          </button>
        </div>
      </button>

      {/* Intensity Slider Panel */}
      {showIntensitySlider && isOverlayEnabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            padding: '12px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: '6px',
            boxShadow: 'var(--card-shadow)',
            zIndex: 1000,
          }}
        >
          {/* Preset Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            marginBottom: '12px',
            justifyContent: 'space-between'
          }}>
            <button
              onClick={() => handlePresetIntensity(OVERLAY_INTENSITIES.LIGHT)}
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: overlayIntensity === OVERLAY_INTENSITIES.LIGHT ? 'var(--accent-color)' : 'var(--bg-secondary)',
                color: overlayIntensity === OVERLAY_INTENSITIES.LIGHT ? 'var(--bg-primary)' : 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Light
            </button>
            <button
              onClick={() => handlePresetIntensity(OVERLAY_INTENSITIES.MEDIUM)}
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: overlayIntensity === OVERLAY_INTENSITIES.MEDIUM ? 'var(--accent-color)' : 'var(--bg-secondary)',
                color: overlayIntensity === OVERLAY_INTENSITIES.MEDIUM ? 'var(--bg-primary)' : 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Medium
            </button>
            <button
              onClick={() => handlePresetIntensity(OVERLAY_INTENSITIES.STRONG)}
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: overlayIntensity === OVERLAY_INTENSITIES.STRONG ? 'var(--accent-color)' : 'var(--bg-secondary)',
                color: overlayIntensity === OVERLAY_INTENSITIES.STRONG ? 'var(--bg-primary)' : 'var(--text-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Strong
            </button>
          </div>

          {/* Custom Slider */}
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '6px'
            }}>
              <label style={{ 
                fontSize: '12px', 
                color: 'var(--text-secondary)',
                fontWeight: '500'
              }}>
                Custom Intensity
              </label>
              <span style={{ 
                fontSize: '11px', 
                color: 'var(--text-tertiary)',
                fontFamily: 'monospace'
              }}>
                {Math.round(overlayIntensity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.7"
              step="0.05"
              value={overlayIntensity}
              onChange={handleIntensityChange}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${(overlayIntensity - 0.1) / 0.6 * 100}%, var(--bg-tertiary) ${(overlayIntensity - 0.1) / 0.6 * 100}%, var(--bg-tertiary) 100%)`,
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer',
              }}
            />
          </div>

          {/* Helper Text */}
          <div style={{ 
            marginTop: '8px',
            fontSize: '11px',
            color: 'var(--text-tertiary)',
            textAlign: 'center'
          }}>
            Adjusts darkness level for comfortable night reading
          </div>
        </div>
      )}
    </div>
  );
}