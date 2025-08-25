import React from 'react';
import type { Tag } from '../services/database';
import '../style/TagSuggestionSection.css';

interface TagSuggestionSectionProps {
  title: string;
  icon: string;
  tags: TagSuggestionItem[];
  onSelectTag: (tag: Tag) => void;
  existingTags: Tag[];
  type: 'most-used' | 'recently-used';
}

export interface TagSuggestionItem {
  tag: Tag;
  metadata: number | string; // usage count for most-used, time string for recently-used
}

export function TagSuggestionSection({
  title,
  icon,
  tags,
  onSelectTag,
  existingTags,
  type
}: TagSuggestionSectionProps) {
  // Helper function to format time difference
  const formatTimeAgo = (dateString: string): string => {
    // Parse the date string - if it doesn't have timezone info, treat it as UTC
    let date = new Date(dateString);
    
    // If the date string doesn't include 'Z' or timezone offset, it might be local time
    // Check if it's a valid ISO string with timezone
    if (!dateString.includes('Z') && !dateString.match(/[+-]\d{2}:\d{2}$/)) {
      // If no timezone indicator, assume it's UTC and add 'Z'
      date = new Date(dateString + 'Z');
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${diffWeeks}w ago`;
  };

  // Filter out tags that are already selected
  const availableTags = tags.filter(item => 
    !existingTags.some(existing => existing.id === item.tag.id)
  );

  // Get rank indicator color based on position
  const getRankColor = (index: number): string => {
    const colors = ['#f59e0b', '#6b7280', '#a78bfa', '#3b82f6', '#10b981', '#6b7280'];
    return colors[index] || '#6b7280';
  };

  return (
    <div className="tag-suggestion-section">
      <div className="tag-suggestion-section__header">
        <span className="tag-suggestion-section__icon">{icon}</span>
        <h4 className="tag-suggestion-section__title">{title}</h4>
      </div>
      
      <div className="tag-suggestion-section__content">
        {availableTags.length === 0 ? (
          <div className="tag-suggestion-section__empty">
            {tags.length === 0 ? 'No tags available' : 'All tags already selected'}
          </div>
        ) : (
          <div className="tag-suggestion-section__list">
            {availableTags.slice(0, 6).map((item, index) => (
              <button
                key={item.tag.id}
                className="tag-suggestion-section__item"
                onClick={() => onSelectTag(item.tag)}
                type="button"
              >
                <span 
                  className="tag-suggestion-section__rank"
                  style={{ backgroundColor: getRankColor(index) }}
                >
                  {index + 1}
                </span>
                
                <span className="tag-suggestion-section__name">
                  {item.tag.name}
                </span>
                
                {type === 'most-used' ? (
                  <span className="tag-suggestion-section__badge">
                    {item.metadata}
                  </span>
                ) : (
                  <span className="tag-suggestion-section__time">
                    {formatTimeAgo(item.metadata as string)}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}