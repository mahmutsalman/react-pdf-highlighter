import React, { useState, useEffect } from 'react';
import type { IHighlight } from '../react-pdf-highlighter';
import '../style/CommentEditModal.css';

interface CommentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (commentText: string, commentEmoji: string) => void;
  highlight: IHighlight;
}

export function CommentEditModal({ isOpen, onClose, onSave, highlight }: CommentEditModalProps) {
  const [commentText, setCommentText] = useState('');
  const [commentEmoji, setCommentEmoji] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load current comment when modal opens
  useEffect(() => {
    if (isOpen && highlight) {
      setCommentText(highlight.comment?.text || '');
      setCommentEmoji(highlight.comment?.emoji || '');
    }
  }, [isOpen, highlight]);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await onSave(commentText, commentEmoji);
      onClose();
    } catch (error) {
      console.error('Error saving comment:', error);
      // Error is handled by parent component
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
    <div className="comment-edit-modal-backdrop" onClick={handleBackdropClick}>
      <div className="comment-edit-modal">
        <div className="comment-edit-modal__header">
          <h3 className="comment-edit-modal__title">Edit Comment</h3>
          <button
            className="comment-edit-modal__close"
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            ×
          </button>
        </div>

        <form className="comment-edit-modal__content" onSubmit={handleSave}>
          <div className="comment-edit-modal__section">
            <label className="comment-edit-modal__label">
              Comment Text
            </label>
            <textarea
              className="comment-edit-modal__textarea"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Your comment"
              rows={4}
              disabled={isSaving}
              autoFocus
            />
          </div>

          <div className="comment-edit-modal__section">
            <label className="comment-edit-modal__label">
              Emoji (optional)
            </label>
            <div className="comment-edit-modal__emoji-grid">
              {["💩", "😱", "😍", "🔥", "😳", "⚠️", "📝", "💡", "🎯", "⭐"].map((emoji) => (
                <label key={emoji} className="comment-edit-modal__emoji-option">
                  <input
                    type="radio"
                    name="emoji"
                    value={emoji}
                    checked={commentEmoji === emoji}
                    onChange={(e) => setCommentEmoji(e.target.value)}
                    disabled={isSaving}
                  />
                  <span className="comment-edit-modal__emoji">{emoji}</span>
                </label>
              ))}
              <label className="comment-edit-modal__emoji-option">
                <input
                  type="radio"
                  name="emoji"
                  value=""
                  checked={commentEmoji === ''}
                  onChange={(e) => setCommentEmoji(e.target.value)}
                  disabled={isSaving}
                />
                <span className="comment-edit-modal__emoji comment-edit-modal__emoji--none">None</span>
              </label>
            </div>
          </div>

          {highlight.content.text && (
            <div className="comment-edit-modal__preview">
              <label className="comment-edit-modal__label">
                Highlight Preview
              </label>
              <blockquote className="comment-edit-modal__quote">
                {highlight.content.text.slice(0, 200)}
                {highlight.content.text.length > 200 && '...'}
              </blockquote>
            </div>
          )}

          <div className="comment-edit-modal__footer">
            <button
              className="comment-edit-modal__button comment-edit-modal__button--secondary"
              onClick={onClose}
              disabled={isSaving}
              type="button"
            >
              Cancel
            </button>
            <button
              className="comment-edit-modal__button comment-edit-modal__button--primary"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? 'Saving...' : 'Save Comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}