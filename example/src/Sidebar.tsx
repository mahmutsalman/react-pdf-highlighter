import React, { useState, useEffect, useMemo } from "react";
import type { IHighlight } from "./react-pdf-highlighter";
import { HighlightContextMenu } from "./components/HighlightContextMenu";
import { TagModal } from "./components/TagModal";
import { TagChip } from "./components/TagChip";
import { CommentEditModal } from "./components/CommentEditModal";
import { TagManagementModal } from "./components/TagManagementModal";
import { databaseService, type Tag } from "./services/database";

interface Props {
  highlights: Array<IHighlight>;
  resetHighlights: () => void;
  toggleDocument: () => void;
  openLocalFile: () => void;
  showAllPdfs: () => void;
  onHighlightsUpdate?: (highlights: Array<IHighlight>) => void;
  onUpdateComment?: (highlightId: string, commentText: string, commentEmoji: string) => Promise<void>;
}

const updateHash = (highlight: IHighlight) => {
  console.log("🔗 Updating hash for highlight:", highlight.id, highlight.comment?.text);
  document.location.hash = `highlight-${highlight.id}`;
  console.log("🔗 Hash updated to:", document.location.hash);
};

declare const APP_VERSION: string;

export function Sidebar({
  highlights,
  toggleDocument,
  resetHighlights,
  openLocalFile,
  showAllPdfs,
  onHighlightsUpdate,
  onUpdateComment,
}: Props) {
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    highlight: IHighlight | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    highlight: null,
  });

  const [tagModal, setTagModal] = useState<{
    isOpen: boolean;
    highlight: IHighlight | null;
  }>({
    isOpen: false,
    highlight: null,
  });

  const [commentEditModal, setCommentEditModal] = useState<{
    isOpen: boolean;
    highlight: IHighlight | null;
  }>({
    isOpen: false,
    highlight: null,
  });

  const [tagManagementModal, setTagManagementModal] = useState<{
    isOpen: boolean;
  }>({
    isOpen: false,
  });

  const [highlightTags, setHighlightTags] = useState<Map<string, Tag[]>>(new Map());
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState<string>("");
  const [showAllTags, setShowAllTags] = useState<boolean>(false);
  const [tagsCache, setTagsCache] = useState<{ tags: Tag[]; timestamp: number } | null>(null);

  // Load tags for all highlights when highlights change
  useEffect(() => {
    loadHighlightTags();
    loadAvailableTags();
  }, [highlights]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+T to open tag modal for the first highlight (if any)
      if ((e.ctrlKey || e.metaKey) && e.key === 't' && highlights.length > 0) {
        e.preventDefault();
        setTagModal({
          isOpen: true,
          highlight: highlights[0],
        });
      }
      
      // Escape to close any open modal
      if (e.key === 'Escape') {
        setContextMenu(prev => ({ ...prev, isOpen: false }));
        setTagModal({ isOpen: false, highlight: null });
        setCommentEditModal({ isOpen: false, highlight: null });
        setTagManagementModal({ isOpen: false });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [highlights]);

  const loadHighlightTags = async () => {
    const tagsMap = new Map<string, Tag[]>();
    
    // Batch load tags for better performance with many highlights
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < highlights.length; i += batchSize) {
      batches.push(highlights.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      const promises = batch.map(async (highlight) => {
        try {
          const tags = await databaseService.getHighlightTags(highlight.id);
          return { highlightId: highlight.id, tags };
        } catch (error) {
          console.error(`Error loading tags for highlight ${highlight.id}:`, error);
          return { highlightId: highlight.id, tags: [] };
        }
      });
      
      const results = await Promise.all(promises);
      results.forEach(({ highlightId, tags }) => {
        tagsMap.set(highlightId, tags);
      });
    }
    
    setHighlightTags(tagsMap);
  };

  const loadAvailableTags = async () => {
    try {
      // Use cache if it's less than 30 seconds old
      const now = Date.now();
      if (tagsCache && (now - tagsCache.timestamp) < 30000) {
        setAvailableTags(tagsCache.tags);
        return;
      }

      const tags = await databaseService.getAllTags();
      setAvailableTags(tags);
      setTagsCache({ tags, timestamp: now });
    } catch (error) {
      console.error('Error loading available tags:', error);
    }
  };

  const handleRightClick = (e: React.MouseEvent, highlight: IHighlight) => {
    e.preventDefault();
    
    // Don't show menu if clicking on a button or tag chip
    if ((e.target as HTMLElement).closest('button') || 
        (e.target as HTMLElement).closest('.tag-chip')) {
      return;
    }

    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      highlight,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  const handleManageTags = () => {
    if (contextMenu.highlight) {
      setTagModal({
        isOpen: true,
        highlight: contextMenu.highlight,
      });
    }
  };

  const handleEditComment = () => {
    if (contextMenu.highlight) {
      setCommentEditModal({
        isOpen: true,
        highlight: contextMenu.highlight,
      });
    }
  };

  const handleCloseTagModal = () => {
    setTagModal({ isOpen: false, highlight: null });
  };

  const handleCloseCommentEditModal = () => {
    setCommentEditModal({ isOpen: false, highlight: null });
  };

  const handleOpenTagManagement = () => {
    setTagManagementModal({ isOpen: true });
  };

  const handleCloseTagManagement = () => {
    setTagManagementModal({ isOpen: false });
  };

  const handleTagsDeleted = async () => {
    // Reload all tags and highlight tags after deletion
    await Promise.all([
      loadAvailableTags(),
      loadHighlightTags()
    ]);
    
    // Clear selected tags if any of them were deleted
    setSelectedTags([]);
    
    // Notify parent if callback provided
    onHighlightsUpdate?.(highlights);
  };

  const handleSaveComment = async (commentText: string, commentEmoji: string) => {
    if (commentEditModal.highlight && onUpdateComment) {
      try {
        await onUpdateComment(commentEditModal.highlight.id, commentText, commentEmoji);
        console.log("Comment updated successfully");
        
        // Notify parent if callback provided
        onHighlightsUpdate?.(highlights);
      } catch (error) {
        console.error("Error updating comment:", error);
        throw error; // Re-throw so the modal can handle the error
      }
    }
  };

  const handleSaveTags = async (tags: Tag[]) => {
    if (tagModal.highlight) {
      // Update the local tags map
      setHighlightTags(prev => {
        const newMap = new Map(prev);
        newMap.set(tagModal.highlight!.id, tags);
        return newMap;
      });

      // Invalidate cache and reload available tags in case new ones were created
      setTagsCache(null);
      await loadAvailableTags();

      // Notify parent if callback provided
      onHighlightsUpdate?.(highlights);
    }
  };

  const handleTagClick = (tag: Tag) => {
    setSelectedTags(prev => {
      const isSelected = prev.some(t => t.id === tag.id);
      if (isSelected) {
        return prev.filter(t => t.id !== tag.id);
      } else {
        return [...prev, tag];
      }
    });
  };

  // Memoized filter for tags based on search query
  const filteredTags = useMemo(() => {
    if (!tagSearchQuery.trim()) {
      return availableTags;
    }
    
    const query = tagSearchQuery.toLowerCase().trim();
    return availableTags.filter(tag => 
      tag.name.toLowerCase().includes(query)
    );
  }, [availableTags, tagSearchQuery]);

  // Calculate visible tags based on limit (approximately 2 lines worth)
  const visibleTagsLimit = 6; // Adjust based on typical tag width - 6 tags typically fit in 2 lines
  const visibleTags = useMemo(() => {
    if (showAllTags || tagSearchQuery) {
      return filteredTags;
    }
    
    // Always show selected tags + limited unselected tags
    const unselectedTags = filteredTags.filter(tag => !selectedTags.some(t => t.id === tag.id));
    const maxUnselected = Math.max(0, visibleTagsLimit - selectedTags.length);
    return [...selectedTags, ...unselectedTags.slice(0, maxUnselected)];
  }, [filteredTags, selectedTags, showAllTags, visibleTagsLimit, tagSearchQuery]);
  
  const hiddenTagsCount = filteredTags.length - visibleTags.length;

  // Memoized filter for better performance
  const filteredHighlights = useMemo(() => {
    if (selectedTags.length === 0) {
      return highlights;
    }
    
    return highlights.filter(highlight => {
      const tags = highlightTags.get(highlight.id) || [];
      return selectedTags.every(selectedTag => 
        tags.some(tag => tag.id === selectedTag.id)
      );
    });
  }, [highlights, highlightTags, selectedTags]);

  return (
    <div className="sidebar" style={{ width: "25vw" }}>
      <div className="description" style={{ padding: "1rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>
          react-pdf-highlighter {APP_VERSION}
        </h2>

        <p style={{ fontSize: "0.7rem" }}>
          <a href="https://github.com/agentcooper/react-pdf-highlighter">
            Open in GitHub
          </a>
        </p>

        <p>
          <small>
            To create area highlight hold ⌥ Option key (Alt), then click and
            drag. Right-click highlights to manage tags. Press Ctrl+T to quickly tag the first highlight.
          </small>
        </p>
      </div>

      {/* Tag Filter Section */}
      {availableTags.length > 0 && (
        <div style={{ padding: "1rem", borderBottom: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "14px", fontWeight: "600" }}>
            Filter by Tags ({selectedTags.length} selected)
          </h3>
          
          {/* Tag Search Input */}
          <div style={{ marginBottom: "0.5rem", position: "relative" }}>
            <input
              type="text"
              placeholder="Search tags..."
              value={tagSearchQuery}
              onChange={(e) => setTagSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 30px 6px 8px",
                fontSize: "13px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                outline: "none",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#60a5fa";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d1d5db";
              }}
            />
            {tagSearchQuery && (
              <button
                type="button"
                onClick={() => setTagSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "4px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  fontSize: "14px",
                  color: "#6b7280",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#374151";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#6b7280";
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Tag Chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
            {/* Show selected tags first, even if they don't match search */}
            {selectedTags.map(tag => (
              <TagChip
                key={tag.id}
                tag={tag}
                onClick={handleTagClick}
                variant="filter"
                size="small"
                onManageAllTags={handleOpenTagManagement}
              />
            ))}
            
            {/* Show visible unselected tags */}
            {visibleTags
              .filter(tag => !selectedTags.some(t => t.id === tag.id))
              .map(tag => (
                <TagChip
                  key={tag.id}
                  tag={tag}
                  onClick={handleTagClick}
                  variant="default"
                  size="small"
                  onManageAllTags={handleOpenTagManagement}
                />
              ))}
            
            {/* Show more/less button */}
            {!tagSearchQuery && (hiddenTagsCount > 0 || showAllTags) && (
              <button
                type="button"
                onClick={() => setShowAllTags(!showAllTags)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4px 12px",
                  fontSize: "12px",
                  fontWeight: "500",
                  color: "#4b5563",
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #d1d5db",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  minWidth: "40px",
                  height: "24px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#e5e7eb";
                  e.currentTarget.style.borderColor = "#9ca3af";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
                title={showAllTags ? "Show less tags" : `Show ${hiddenTagsCount} more tags`}
              >
                {showAllTags ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "14px", lineHeight: "1" }}>✕</span>
                    <span>Show less</span>
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                    <span style={{ fontSize: "16px", lineHeight: "1" }}>•••</span>
                    <span>+{hiddenTagsCount}</span>
                  </span>
                )}
              </button>
            )}
          </div>
          
          {/* Show message if no tags match search */}
          {tagSearchQuery && filteredTags.length === 0 && (
            <div style={{ 
              marginTop: "8px", 
              fontSize: "12px", 
              color: "#6b7280",
              fontStyle: "italic" 
            }}>
              No tags match "{tagSearchQuery}"
            </div>
          )}
          
          {/* Show count of matching tags */}
          {tagSearchQuery && filteredTags.length > 0 && (
            <div style={{ 
              marginTop: "8px", 
              fontSize: "12px", 
              color: "#6b7280" 
            }}>
              Showing {filteredTags.length} of {availableTags.length} tags
            </div>
          )}
          {(selectedTags.length > 0 || showAllTags) && (
            <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
              {selectedTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTags([])}
                  style={{
                    padding: "4px 8px",
                    fontSize: "12px",
                    background: "none",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <ul className="sidebar__highlights">
        {filteredHighlights.map((highlight, index) => {
          const tags = highlightTags.get(highlight.id) || [];
          
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: This is an example app
              key={index}
              className="sidebar__highlight"
              onClick={() => {
                updateHash(highlight);
              }}
              onContextMenu={(e) => handleRightClick(e, highlight)}
              style={{ cursor: "pointer" }}
            >
              <div>
                <strong>{highlight.comment.text}</strong>
                {highlight.content.text ? (
                  <blockquote style={{ marginTop: "0.5rem" }}>
                    {`${highlight.content.text.slice(0, 90).trim()}…`}
                  </blockquote>
                ) : null}
                {highlight.content.image ? (
                  <div
                    className="highlight__image"
                    style={{ marginTop: "0.5rem" }}
                  >
                    <img src={highlight.content.image} alt={"Screenshot"} />
                  </div>
                ) : null}
                
                {/* Display tags */}
                {tags.length > 0 && (
                  <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {tags.map(tag => (
                      <TagChip 
                        key={tag.id} 
                        tag={tag} 
                        size="small"
                        onManageAllTags={handleOpenTagManagement}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="highlight__location">
                Page {highlight.position.pageNumber}
              </div>
            </li>
          );
        })}
      </ul>
      
      {filteredHighlights.length === 0 && highlights.length > 0 && (
        <div style={{ padding: "1rem", textAlign: "center", color: "#6b7280" }}>
          No highlights match the selected tags.
        </div>
      )}

      <div style={{ padding: "1rem" }}>
        <button type="button" onClick={openLocalFile} style={{ marginBottom: "0.5rem", width: "100%" }}>
          Open Local PDF File
        </button>
        <button type="button" onClick={showAllPdfs} style={{ marginBottom: "0.5rem", width: "100%" }}>
          Show All PDFs
        </button>
        <button type="button" onClick={toggleDocument} style={{ width: "100%" }}>
          Toggle Sample Document
        </button>
      </div>
      {highlights.length > 0 ? (
        <div style={{ padding: "1rem" }}>
          <button type="button" onClick={resetHighlights}>
            Reset highlights
          </button>
        </div>
      ) : null}

      {/* Context Menu */}
      <HighlightContextMenu
        isOpen={contextMenu.isOpen}
        onClose={handleCloseContextMenu}
        onManageTags={handleManageTags}
        onEdit={handleEditComment}
        position={contextMenu.position}
        highlight={contextMenu.highlight!}
      />

      {/* Tag Modal */}
      {tagModal.highlight && (
        <TagModal
          isOpen={tagModal.isOpen}
          onClose={handleCloseTagModal}
          onSave={handleSaveTags}
          highlight={tagModal.highlight}
        />
      )}

      {/* Comment Edit Modal */}
      {commentEditModal.highlight && (
        <CommentEditModal
          isOpen={commentEditModal.isOpen}
          onClose={handleCloseCommentEditModal}
          onSave={handleSaveComment}
          highlight={commentEditModal.highlight}
        />
      )}

      {/* Tag Management Modal */}
      <TagManagementModal
        isOpen={tagManagementModal.isOpen}
        onClose={handleCloseTagManagement}
        onTagsDeleted={handleTagsDeleted}
      />
    </div>
  );
}
