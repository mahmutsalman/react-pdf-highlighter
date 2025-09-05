import React, { useState, useEffect, useMemo } from 'react';
import type { Tag } from '../services/database';
import { databaseService } from '../services/database';
import '../style/TagManagementModal.css';

interface TagManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTagsDeleted: () => void;
  currentPdfId?: number;
}

interface TagWithUsage {
  tag: Tag;
  usageCount: number;
}

export function TagManagementModal({
  isOpen,
  onClose,
  onTagsDeleted,
  currentPdfId,
}: TagManagementModalProps) {
  const [tags, setTags] = useState<TagWithUsage[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showGlobalTags, setShowGlobalTags] = useState(false);

  // Load tags with usage counts when modal opens or toggle changes
  useEffect(() => {
    if (isOpen) {
      loadTags();
    } else {
      // Reset state when modal closes
      setSelectedTagIds(new Set());
      setError(null);
      setShowConfirmDialog(false);
      setSearchQuery("");
      setShowGlobalTags(false);
    }
  }, [isOpen, showGlobalTags]);

  const loadTags = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let tagsWithUsage: { tag: Tag; usageCount: number }[];
      
      if (showGlobalTags || !currentPdfId) {
        // Load global tags
        tagsWithUsage = await databaseService.getTagsWithUsageCount();
      } else {
        // Load book-specific tags
        tagsWithUsage = await databaseService.getTagsWithUsageCountForBook(currentPdfId);
      }
      
      setTags(tagsWithUsage);
    } catch (err) {
      console.error('Error loading tags:', err);
      setError('Failed to load tags. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter tags based on search query
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) {
      return tags;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return tags.filter(tagWithUsage => 
      tagWithUsage.tag.name.toLowerCase().includes(query)
    );
  }, [tags, searchQuery]);

  const selectedTags = useMemo(() => {
    return tags.filter(tagWithUsage => selectedTagIds.has(tagWithUsage.tag.id));
  }, [tags, selectedTagIds]);

  const isAllSelected = useMemo(() => {
    return filteredTags.length > 0 && filteredTags.every(tagWithUsage => selectedTagIds.has(tagWithUsage.tag.id));
  }, [filteredTags, selectedTagIds]);

  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      // Deselect all filtered tags
      setSelectedTagIds(prev => {
        const newSet = new Set(prev);
        filteredTags.forEach(tagWithUsage => {
          newSet.delete(tagWithUsage.tag.id);
        });
        return newSet;
      });
    } else {
      // Select all filtered tags
      setSelectedTagIds(prev => {
        const newSet = new Set(prev);
        filteredTags.forEach(tagWithUsage => {
          newSet.add(tagWithUsage.tag.id);
        });
        return newSet;
      });
    }
  };

  const handleDeleteClick = () => {
    if (selectedTagIds.size === 0) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (selectedTagIds.size === 0) return;

    try {
      setDeleting(true);
      setError(null);
      
      const tagIdsArray = Array.from(selectedTagIds);
      await databaseService.bulkDeleteTags(tagIdsArray);
      
      // Notify parent that tags were deleted
      onTagsDeleted();
      
      // Close modal
      onClose();
    } catch (err) {
      console.error('Error deleting tags:', err);
      setError('Failed to delete tags. Please try again.');
      setShowConfirmDialog(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showConfirmDialog) {
        handleCancelDelete();
      } else {
        onClose();
      }
    } else if (e.key === 'Delete' && selectedTagIds.size > 0 && !showConfirmDialog) {
      handleDeleteClick();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !showConfirmDialog) {
      e.preventDefault();
      handleSelectAll();
    }
  };

  const totalHighlights = useMemo(() => {
    return selectedTags.reduce((sum, tagWithUsage) => sum + tagWithUsage.usageCount, 0);
  }, [selectedTags]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="tag-management-modal-backdrop" onClick={onClose} onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="tag-management-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tag-management-modal__header">
          <h2 className="tag-management-modal__title">Manage Tags</h2>
          <button
            className="tag-management-modal__close"
            onClick={onClose}
            type="button"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="tag-management-modal__content">
          {error && (
            <div className="tag-management-modal__error">
              {error}
            </div>
          )}

          {loading ? (
            <div className="tag-management-modal__loading">
              Loading tags...
            </div>
          ) : (
            <>
              {/* Search Input */}
              <div className="tag-management-modal__search">
                <div className="tag-management-modal__search-input-wrapper">
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="tag-management-modal__search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="tag-management-modal__search-clear"
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Tag Scope Toggle */}
              {currentPdfId && (
                <div className="tag-management-modal__scope-toggle">
                  <label className="tag-management-modal__toggle-label">
                    <input
                      type="checkbox"
                      checked={showGlobalTags}
                      onChange={(e) => setShowGlobalTags(e.target.checked)}
                      className="tag-management-modal__toggle-checkbox"
                    />
                    <span className="tag-management-modal__toggle-text">
                      {showGlobalTags ? 'Showing all tags' : 'Showing tags for this book only'}
                    </span>
                  </label>
                </div>
              )}

              {/* Controls */}
              <div className="tag-management-modal__controls">
                <div className="tag-management-modal__stats">
                  {tags.length === 0 ? (
                    <span>No tags found</span>
                  ) : searchQuery ? (
                    <span>
                      {selectedTagIds.size} selected • {filteredTags.length} of {tags.length} tags shown
                    </span>
                  ) : (
                    <span>
                      {selectedTagIds.size} of {tags.length} tags selected
                    </span>
                  )}
                </div>
                
                {filteredTags.length > 0 && (
                  <button
                    className="tag-management-modal__select-all"
                    onClick={handleSelectAll}
                    type="button"
                  >
                    {isAllSelected ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              {/* Tag List */}
              {tags.length === 0 ? (
                <div className="tag-management-modal__empty">
                  No tags have been created yet.
                </div>
              ) : filteredTags.length === 0 ? (
                <div className="tag-management-modal__empty">
                  No tags match "{searchQuery}".
                </div>
              ) : (
                <div className="tag-management-modal__tag-list">
                  {filteredTags.map(({ tag, usageCount }) => (
                    <label
                      key={tag.id}
                      className={`tag-management-modal__tag-item ${
                        selectedTagIds.has(tag.id) ? 'tag-management-modal__tag-item--selected' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="tag-management-modal__checkbox"
                        checked={selectedTagIds.has(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                      />
                      <div className="tag-management-modal__tag-info">
                        <span className="tag-management-modal__tag-name">{tag.name}</span>
                        <span className="tag-management-modal__tag-usage">
                          {usageCount} highlight{usageCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="tag-management-modal__footer">
          <button
            className="tag-management-modal__button tag-management-modal__button--secondary"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          
          <button
            className="tag-management-modal__button tag-management-modal__button--danger"
            onClick={handleDeleteClick}
            disabled={selectedTagIds.size === 0 || deleting}
            type="button"
          >
            {deleting ? 'Deleting...' : `Delete ${selectedTagIds.size} Tag${selectedTagIds.size !== 1 ? 's' : ''}`}
          </button>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmDialog && (
          <div className="tag-management-modal__confirm-backdrop">
            <div className="tag-management-modal__confirm-dialog">
              <div className="tag-management-modal__confirm-header">
                <h3 className="tag-management-modal__confirm-title">Confirm Deletion</h3>
              </div>
              
              <div className="tag-management-modal__confirm-content">
                <p>
                  Are you sure you want to delete {selectedTagIds.size} tag{selectedTagIds.size !== 1 ? 's' : ''}?
                </p>
                
                {totalHighlights > 0 && (
                  <p className="tag-management-modal__confirm-warning">
                    This will remove {selectedTagIds.size === 1 ? 'this tag' : 'these tags'} from {totalHighlights} highlight{totalHighlights !== 1 ? 's' : ''}.
                  </p>
                )}
                
                <p className="tag-management-modal__confirm-warning">
                  <strong>This action cannot be undone.</strong>
                </p>
              </div>
              
              <div className="tag-management-modal__confirm-footer">
                <button
                  className="tag-management-modal__button tag-management-modal__button--secondary"
                  onClick={handleCancelDelete}
                  type="button"
                  disabled={deleting}
                >
                  Cancel
                </button>
                
                <button
                  className="tag-management-modal__button tag-management-modal__button--danger"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  type="button"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}