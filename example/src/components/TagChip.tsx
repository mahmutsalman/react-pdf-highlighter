import React, { useState } from 'react';
import type { Tag } from '../services/database';
import '../style/TagChip.css';

interface TagChipProps {
  tag: Tag;
  onRemove?: (tag: Tag) => void;
  isRemovable?: boolean;
  size?: 'small' | 'medium';
  variant?: 'default' | 'filter';
  onClick?: (tag: Tag) => void;
  onManageAllTags?: () => void;
}

export function TagChip({ 
  tag, 
  onRemove, 
  isRemovable = false, 
  size = 'small',
  variant = 'default',
  onClick,
  onManageAllTags
}: TagChipProps) {
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(tag);
  };

  const handleClick = () => {
    onClick?.(tag);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    if (!onManageAllTags) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  const handleManageAllTags = () => {
    onManageAllTags?.();
    handleCloseContextMenu();
  };

  // Close context menu on outside click
  React.useEffect(() => {
    if (!contextMenu.isOpen) return;

    const handleClickOutside = () => {
      handleCloseContextMenu();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseContextMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu.isOpen]);

  const classNames = [
    'tag-chip',
    `tag-chip--${size}`,
    `tag-chip--${variant}`,
    onClick ? 'tag-chip--clickable' : '',
  ].filter(Boolean).join(' ');

  const getContextMenuStyle = (): React.CSSProperties => {
    const menuWidth = 160;
    const menuHeight = 50;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = contextMenu.position.x;
    let top = contextMenu.position.y;

    // Horizontal overflow prevention
    if (left + menuWidth > windowWidth) {
      left = windowWidth - menuWidth - 10;
    }
    if (left < 10) {
      left = 10;
    }

    // Vertical overflow prevention
    if (top + menuHeight > windowHeight) {
      top = contextMenu.position.y - menuHeight - 10;
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

  return (
    <>
      <span 
        className={classNames}
        onClick={handleClick}
        onContextMenu={handleRightClick}
        title={tag.name}
      >
        <span className="tag-chip__text">{tag.name}</span>
        {isRemovable && onRemove && (
          <button
            className="tag-chip__remove"
            onClick={handleRemove}
            aria-label={`Remove ${tag.name} tag`}
            type="button"
          >
            ×
          </button>
        )}
      </span>

      {/* Context Menu */}
      {contextMenu.isOpen && onManageAllTags && (
        <div
          className="tag-chip-context-menu"
          style={getContextMenuStyle()}
        >
          <button
            className="tag-chip-context-menu__item"
            onClick={handleManageAllTags}
            type="button"
          >
            <span className="tag-chip-context-menu__icon">🏷️</span>
            <span>Manage All Tags</span>
          </button>
        </div>
      )}
    </>
  );
}