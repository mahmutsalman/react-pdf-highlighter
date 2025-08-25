import React, { useState, useEffect, useRef, useCallback } from 'react';
import { databaseService, type Tag } from '../services/database';
import '../style/TagAutocomplete.css';

interface TagAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectTag: (tagName: string) => void;
  placeholder?: string;
  existingTags?: Tag[];
  disabled?: boolean;
  autoFocus?: boolean;
}

export function TagAutocomplete({
  value,
  onChange,
  onSelectTag,
  placeholder = "Type to search or create tags...",
  existingTags = [],
  disabled = false,
  autoFocus = false,
}: TagAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Debounced fetch suggestions
  const debouncedFetchSuggestions = useCallback(async (query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (query.length === 0) {
        // Show some existing tags when input is empty
        const allTags = await databaseService.getAllTags();
        const availableTags = allTags
          .filter(tag => !existingTags.some(existing => existing.name === tag.name))
          .map(tag => tag.name)
          .slice(0, 8);
        setSuggestions(availableTags);
        setShowSuggestions(availableTags.length > 0);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Get suggestions from database
        const dbSuggestions = await databaseService.getTagSuggestions(query, 10);
        
        // Filter out already selected tags
        const filteredSuggestions = dbSuggestions.filter(suggestion => 
          !existingTags.some(tag => tag.name.toLowerCase() === suggestion.toLowerCase())
        );

        setSuggestions(filteredSuggestions);
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error fetching tag suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    }, 150);
  }, [existingTags]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    debouncedFetchSuggestions(newValue);
  };

  // Handle input focus
  const handleInputFocus = () => {
    // Only show existing suggestions if the field has content
    // Don't automatically load suggestions for empty fields
    if (value.length > 0 && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  // Handle input blur (with delay to allow click on suggestions)
  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    console.log('⌨️ TagAutocomplete: Key pressed:', e.key, 'Value:', value, 'ShowSuggestions:', showSuggestions);
    
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && value.trim()) {
        e.preventDefault();
        console.log('🎯 TagAutocomplete: Enter pressed with value:', value.trim());
        onSelectTag(value.trim());
        onChange('');
        setShowSuggestions(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          console.log('🎯 TagAutocomplete: Enter pressed, selecting suggestion:', suggestions[selectedIndex]);
          onSelectTag(suggestions[selectedIndex]);
        } else if (value.trim()) {
          console.log('🎯 TagAutocomplete: Enter pressed, creating new tag:', value.trim());
          onSelectTag(value.trim());
        }
        onChange('');
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
      
      case 'Tab':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          console.log('🎯 TagAutocomplete: Tab pressed, selecting suggestion:', suggestions[selectedIndex]);
          onSelectTag(suggestions[selectedIndex]);
          onChange('');
          setShowSuggestions(false);
          setSelectedIndex(-1);
        }
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    onSelectTag(suggestion);
    onChange('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="tag-autocomplete">
      <div className="tag-autocomplete__input-container">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="tag-autocomplete__input"
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
        />
        {isLoading && (
          <div className="tag-autocomplete__loading">
            <div className="tag-autocomplete__spinner" />
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="tag-autocomplete__suggestions"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`tag-autocomplete__suggestion ${
                index === selectedIndex ? 'tag-autocomplete__suggestion--selected' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="tag-autocomplete__suggestion-text">
                {suggestion}
              </span>
            </div>
          ))}
          
          {value.trim() && !suggestions.includes(value.trim()) && (
            <div
              className={`tag-autocomplete__suggestion tag-autocomplete__suggestion--create ${
                selectedIndex === suggestions.length ? 'tag-autocomplete__suggestion--selected' : ''
              }`}
              onClick={() => handleSuggestionClick(value.trim())}
              onMouseEnter={() => setSelectedIndex(suggestions.length)}
            >
              <span className="tag-autocomplete__suggestion-text">
                Create "{value.trim()}"
              </span>
              <span className="tag-autocomplete__suggestion-hint">↵</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}