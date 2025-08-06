import React, { useState, useEffect, useMemo } from "react";
import type { IHighlight } from "./react-pdf-highlighter";
import { HighlightContextMenu } from "./components/HighlightContextMenu";
import { TagModal } from "./components/TagModal";
import { TagChip } from "./components/TagChip";
import { databaseService, type Tag } from "./services/database";

interface Props {
  highlights: Array<IHighlight>;
  resetHighlights: () => void;
  toggleDocument: () => void;
  openLocalFile: () => void;
  showAllPdfs: () => void;
  onHighlightsUpdate?: (highlights: Array<IHighlight>) => void;
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

  const [highlightTags, setHighlightTags] = useState<Map<string, Tag[]>>(new Map());
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
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

  const handleCloseTagModal = () => {
    setTagModal({ isOpen: false, highlight: null });
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {availableTags.map(tag => (
              <TagChip
                key={tag.id}
                tag={tag}
                onClick={handleTagClick}
                variant={selectedTags.some(t => t.id === tag.id) ? "filter" : "default"}
                size="small"
              />
            ))}
          </div>
          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTags([])}
              style={{
                marginTop: "8px",
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
                      <TagChip key={tag.id} tag={tag} size="small" />
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
    </div>
  );
}
