import React, { useState } from 'react';

export type SortOption = 'name' | 'lastOpened';

interface SortingDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortingDropdown({ value, onChange }: SortingDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const options = [
    { value: 'name' as const, label: 'Static (Alphabetical)', icon: '📋' },
    { value: 'lastOpened' as const, label: 'Last Opened First', icon: '🕒' },
  ];

  const currentOption = options.find(option => option.value === value) || options[1];

  const handleOptionClick = (optionValue: SortOption) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="sorting-dropdown" style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          minWidth: '160px',
          justifyContent: 'space-between',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{currentOption.icon}</span>
          <span>Sort: {currentOption.value === 'name' ? 'Static' : 'Recent'}</span>
        </div>
        <span style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          ▼
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close dropdown when clicking outside */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 998,
            }}
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-primary)',
              borderRadius: '6px',
              boxShadow: 'var(--card-shadow)',
              zIndex: 999,
              overflow: 'hidden',
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: option.value === value ? 'var(--bg-tertiary)' : 'transparent',
                  color: 'var(--text-primary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (option.value !== value) {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (option.value !== value) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: '16px' }}>{option.icon}</span>
                <div>
                  <div style={{ fontWeight: '500' }}>
                    {option.value === 'name' ? 'Static' : 'Last Opened First'}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)',
                    marginTop: '2px'
                  }}>
                    {option.value === 'name' 
                      ? 'Cards stay in alphabetical order'
                      : 'Recently opened books appear first'
                    }
                  </div>
                </div>
                {option.value === value && (
                  <span style={{ 
                    marginLeft: 'auto',
                    color: 'var(--accent-color)',
                    fontSize: '14px'
                  }}>
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}