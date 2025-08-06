import React from 'react';
import type { Tag } from '../services/database';
import '../style/TagChip.css';

interface TagChipProps {
  tag: Tag;
  onRemove?: (tag: Tag) => void;
  isRemovable?: boolean;
  size?: 'small' | 'medium';
  variant?: 'default' | 'filter';
  onClick?: (tag: Tag) => void;
}

export function TagChip({ 
  tag, 
  onRemove, 
  isRemovable = false, 
  size = 'small',
  variant = 'default',
  onClick 
}: TagChipProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(tag);
  };

  const handleClick = () => {
    onClick?.(tag);
  };

  const classNames = [
    'tag-chip',
    `tag-chip--${size}`,
    `tag-chip--${variant}`,
    onClick ? 'tag-chip--clickable' : '',
  ].filter(Boolean).join(' ');

  return (
    <span 
      className={classNames}
      onClick={handleClick}
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
  );
}