import React, { useEffect, useRef } from 'react';
import type { IHighlight } from '../react-pdf-highlighter';
import '../style/HighlightContextMenu.css';

interface HighlightContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onManageTags: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  position: { x: number; y: number };
  highlight: IHighlight;
}

export function HighlightContextMenu({
  isOpen,
  onClose,
  onManageTags,
  onEdit,
  onDelete,
  position,
  highlight,
}: HighlightContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const getMenuStyle = (): React.CSSProperties => {
    const menuWidth = 180;
    const menuHeight = 120;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = position.x;
    let top = position.y;

    // Horizontal overflow prevention
    if (left + menuWidth > windowWidth) {
      left = windowWidth - menuWidth - 10;
    }
    if (left < 10) {
      left = 10;
    }

    // Vertical overflow prevention
    if (top + menuHeight > windowHeight) {
      top = position.y - menuHeight - 10;
    }
    if (top < 10) {
      top = 10;
    }

    return {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 1000,
    };
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="highlight-context-menu"
      style={getMenuStyle()}
    >
      <div className="highlight-context-menu__header">
        <span className="highlight-context-menu__title">Highlight Options</span>
      </div>
      
      <div className="highlight-context-menu__content">
        <button
          className="highlight-context-menu__item"
          onClick={() => {
            onManageTags();
            onClose();
          }}
          type="button"
        >
          <span className="highlight-context-menu__icon">🏷️</span>
          <span>Manage Tags</span>
        </button>

        {onEdit && (
          <button
            className="highlight-context-menu__item"
            onClick={() => {
              onEdit();
              onClose();
            }}
            type="button"
          >
            <span className="highlight-context-menu__icon">✏️</span>
            <span>Edit Comment</span>
          </button>
        )}

        <button
          className="highlight-context-menu__item"
          onClick={() => {
            navigator.clipboard.writeText(highlight.content.text || '');
            onClose();
          }}
          type="button"
        >
          <span className="highlight-context-menu__icon">📋</span>
          <span>Copy Text</span>
        </button>

        {onDelete && (
          <>
            <div className="highlight-context-menu__separator" />
            <button
              className="highlight-context-menu__item highlight-context-menu__item--danger"
              onClick={() => {
                onDelete();
                onClose();
              }}
              type="button"
            >
              <span className="highlight-context-menu__icon">🗑️</span>
              <span>Delete Highlight</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}