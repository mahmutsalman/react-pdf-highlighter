import React, { useState, useEffect, useCallback } from 'react';
import { TagAutocomplete } from './TagAutocomplete';
import { TagChip } from './TagChip';
import { TagSuggestionSection, type TagSuggestionItem } from './TagSuggestionSection';
import { databaseService, type Tag } from '../services/database';
import type { IHighlight } from '../react-pdf-highlighter';
import '../style/TagModal.css';

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tags: Tag[]) => void;
  highlight: IHighlight;
}

export function TagModal({ isOpen, onClose, onSave, highlight }: TagModalProps) {
  const [currentTags, setCurrentTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostUsedTags, setMostUsedTags] = useState<TagSuggestionItem[]>([]);
  const [recentlyUsedTags, setRecentlyUsedTags] = useState<TagSuggestionItem[]>([]);

  // Load current tags and suggestions when modal opens
  useEffect(() => {
    if (isOpen && highlight.id) {
      loadCurrentTags();
      loadTagSuggestions();
    }
  }, [isOpen, highlight.id]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const loadCurrentTags = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const tags = await databaseService.getHighlightTags(highlight.id);
      setCurrentTags(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
      setError('Failed to load tags');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTagSuggestions = async () => {
    try {
      // Load most used tags
      const mostUsed = await databaseService.getMostUsedTags(6);
      setMostUsedTags(mostUsed.map(item => ({
        tag: item.tag,
        metadata: item.usageCount
      })));

      // Load recently used tags
      const recentlyUsed = await databaseService.getRecentlyUsedTags(6);
      setRecentlyUsedTags(recentlyUsed.map(item => ({
        tag: item.tag,
        metadata: item.lastUsedAt
      })));
    } catch (error) {
      console.error('Error loading tag suggestions:', error);
      // Don't show error to user as suggestions are optional
    }
  };

  const handleAddTag = useCallback(async (tagNameOrTag: string | Tag) => {
    // Handle both string (from autocomplete) and Tag object (from suggestions)
    const isTagObject = typeof tagNameOrTag === 'object' && 'name' in tagNameOrTag;
    const tagName = isTagObject ? tagNameOrTag.name : tagNameOrTag;
    
    console.log('🏷️ TagModal: handleAddTag called with:', tagName, isTagObject ? '(from suggestions)' : '(from input)');
    const trimmedName = tagName.trim();
    if (!trimmedName) {
      console.log('❌ TagModal: Empty tag name, ignoring');
      return;
    }

    // Check if tag already exists in current selection
    if (currentTags.some(tag => tag.name.toLowerCase() === trimmedName.toLowerCase())) {
      console.log('⚠️ TagModal: Tag already exists in current selection:', trimmedName);
      return;
    }

    try {
      let tag: Tag;
      
      if (isTagObject) {
        // Tag from suggestions - already has an ID
        tag = tagNameOrTag as Tag;
        console.log('📝 TagModal: Using existing tag from suggestions:', tag);
      } else {
        // New tag from input - need to create it
        console.log('💾 TagModal: Adding tag to database:', trimmedName);
        const tagId = await databaseService.addTag(trimmedName);
        console.log('✅ TagModal: Tag added to database with ID:', tagId);
        
        tag = {
          id: tagId,
          name: trimmedName,
          created_at: new Date().toISOString()
        };
      }

      console.log('📝 TagModal: Adding tag to currentTags state:', tag);
      setCurrentTags(prev => {
        const newTags = [...prev, tag];
        console.log('🔄 TagModal: Updated currentTags:', newTags);
        return newTags;
      });
      setInputValue('');
    } catch (error) {
      console.error('❌ TagModal: Error adding tag:', error);
      setError('Failed to add tag');
    }
  }, [currentTags]);

  const handleRemoveTag = useCallback((tagToRemove: Tag) => {
    setCurrentTags(prev => prev.filter(tag => tag.id !== tagToRemove.id));
  }, []);

  const handleSave = async () => {
    console.log('💾 TagModal: Save button clicked, starting save process...');
    console.log('📊 TagModal: Current tags to save:', currentTags);
    console.log('📝 TagModal: Input value:', inputValue);
    console.log('🎯 TagModal: Highlight ID:', highlight.id);
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Prepare final tags list (current tags + any text in input)
      let finalTags = [...currentTags];
      
      // Auto-add any text currently in the input field
      if (inputValue.trim()) {
        const trimmedInput = inputValue.trim();
        console.log('🔄 TagModal: Auto-adding typed text before save:', trimmedInput);
        
        // Check if tag already exists in current selection
        if (!finalTags.some(tag => tag.name.toLowerCase() === trimmedInput.toLowerCase())) {
          try {
            // Ensure tag exists in database
            const tagId = await databaseService.addTag(trimmedInput);
            const newTag: Tag = {
              id: tagId,
              name: trimmedInput,
              created_at: new Date().toISOString()
            };
            finalTags.push(newTag);
            console.log('✅ TagModal: Auto-added tag to final list:', newTag);
          } catch (error) {
            console.error('❌ TagModal: Error auto-adding tag:', error);
          }
        } else {
          console.log('⚠️ TagModal: Tag already exists in selection, skipping auto-add');
        }
      }
      
      console.log('📋 TagModal: Final tags to save:', finalTags);
      
      console.log('🔍 TagModal: Getting original tags from database...');
      // Get original tags to determine what to add/remove
      const originalTags = await databaseService.getHighlightTags(highlight.id);
      console.log('📋 TagModal: Original tags from database:', originalTags);
      
      // Calculate additions and removals using final tags
      const tagsToAdd = finalTags.filter(finalTag => 
        !originalTags.some(originalTag => originalTag.id === finalTag.id)
      );
      
      const tagsToRemove = originalTags.filter(originalTag => 
        !finalTags.some(finalTag => finalTag.id === originalTag.id)
      );

      console.log('➕ TagModal: Tags to add:', tagsToAdd);
      console.log('➖ TagModal: Tags to remove:', tagsToRemove);

      // Apply changes
      for (const tag of tagsToAdd) {
        console.log('💾 TagModal: Adding highlight-tag relationship:', highlight.id, '←→', tag.name);
        try {
          await databaseService.addHighlightTag(highlight.id, tag.name);
          console.log('✅ TagModal: Added highlight-tag relationship successfully');
        } catch (error) {
          console.error('❌ TagModal: Failed to add tag relationship:', error);
          
          // Provide specific error message based on the error type
          if (error instanceof Error && error.message.includes('not found in the database')) {
            throw new Error(`Cannot add tag "${tag.name}": The highlight was not properly saved to the database. Please try creating the highlight again.`);
          } else {
            throw new Error(`Failed to add tag "${tag.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      for (const tag of tagsToRemove) {
        console.log('🗑️ TagModal: Removing highlight-tag relationship:', highlight.id, '←→', tag.id);
        await databaseService.removeHighlightTag(highlight.id, tag.id);
        console.log('✅ TagModal: Removed highlight-tag relationship successfully');
      }

      console.log('🎉 TagModal: All tag operations completed successfully');
      
      // Notify parent component with final tags
      console.log('📤 TagModal: Notifying parent component with updated tags');
      onSave(finalTags);
      onClose();
    } catch (error) {
      console.error('❌ TagModal: Error saving tags:', error);
      setError('Failed to save tags');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="tag-modal-backdrop" onClick={handleBackdropClick}>
      <div className="tag-modal">
        <div className="tag-modal__header">
          <h3 className="tag-modal__title">Manage Tags</h3>
          <button
            className="tag-modal__close"
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            ×
          </button>
        </div>

        <div className="tag-modal__content">
          {error && (
            <div className="tag-modal__error">
              {error}
            </div>
          )}

          {/* Tag Suggestions */}
          <div className="tag-modal__suggestions">
            <TagSuggestionSection
              title="Most Used"
              icon="📊"
              tags={mostUsedTags}
              onSelectTag={handleAddTag}
              existingTags={currentTags}
              type="most-used"
            />
            <TagSuggestionSection
              title="Recently Used"
              icon="🕐"
              tags={recentlyUsedTags}
              onSelectTag={handleAddTag}
              existingTags={currentTags}
              type="recently-used"
            />
          </div>

          <div className="tag-modal__section">
            <label className="tag-modal__label">
              Add Tags
            </label>
            <TagAutocomplete
              value={inputValue}
              onChange={setInputValue}
              onSelectTag={handleAddTag}
              existingTags={currentTags}
              disabled={isLoading || isSaving}
              autoFocus
            />
            <p className="tag-modal__hint">
              Type to search existing tags or create new ones. Press Enter to add, or click Save to auto-add.
              {inputValue.trim() && (
                <span style={{ color: '#059669', fontWeight: '500' }}>
                  {' '}"{inputValue.trim()}" will be added when you save.
                </span>
              )}
            </p>
          </div>

          <div className="tag-modal__section">
            <label className="tag-modal__label">
              Current Tags ({currentTags.length})
            </label>
            {isLoading ? (
              <div className="tag-modal__loading">
                Loading tags...
              </div>
            ) : currentTags.length > 0 ? (
              <div className="tag-modal__tags">
                {currentTags.map(tag => (
                  <TagChip
                    key={tag.id}
                    tag={tag}
                    onRemove={handleRemoveTag}
                    isRemovable
                    size="medium"
                  />
                ))}
              </div>
            ) : (
              <div className="tag-modal__empty">
                No tags added yet. Use the input above to add tags.
              </div>
            )}
          </div>

          {highlight.content.text && (
            <div className="tag-modal__preview">
              <label className="tag-modal__label">
                Highlight Preview
              </label>
              <blockquote className="tag-modal__quote">
                {highlight.content.text.slice(0, 200)}
                {highlight.content.text.length > 200 && '...'}
              </blockquote>
            </div>
          )}
        </div>

        <div className="tag-modal__footer">
          <button
            className="tag-modal__button tag-modal__button--secondary"
            onClick={onClose}
            disabled={isSaving}
            type="button"
          >
            Cancel
          </button>
          <button
            className="tag-modal__button tag-modal__button--primary"
            onClick={handleSave}
            disabled={isLoading || isSaving}
            type="button"
          >
            {isSaving ? 'Saving...' : inputValue.trim() ? `Save Tags (+ "${inputValue.trim()}")` : 'Save Tags'}
          </button>
        </div>
      </div>
    </div>
  );
}