'use client';

import React, { useState, useRef, useEffect } from 'react';
import { validateTag, normalizeTag, getTagColor } from '@/app/types';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
}

export default function TagInput({ 
  tags, 
  onChange, 
  suggestions = [], 
  placeholder = "Add tags...",
  maxTags = 20 
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input and exclude already added tags
  const filteredSuggestions = suggestions
    .filter(s => 
      s.toLowerCase().includes(input.toLowerCase()) && 
      !tags.includes(s)
    )
    .slice(0, 5);

  useEffect(() => {
    // Handle click outside to close suggestions
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const normalized = normalizeTag(tag);
    
    if (!normalized) {
      setError('Tag cannot be empty');
      return;
    }

    if (tags.includes(normalized)) {
      setError('Tag already added');
      return;
    }

    if (tags.length >= maxTags) {
      setError(`Maximum ${maxTags} tags allowed`);
      return;
    }

    const validation = validateTag(normalized);
    if (!validation.valid) {
      setError(validation.error || 'Invalid tag');
      return;
    }

    onChange([...tags, normalized]);
    setInput('');
    setError('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) {
        if (showSuggestions && selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
          addTag(filteredSuggestions[selectedIndex]);
        } else {
          addTag(input);
        }
      }
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      // Remove last tag if input is empty
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'ArrowDown' && showSuggestions && filteredSuggestions.length > 0) {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp' && showSuggestions && filteredSuggestions.length > 0) {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    setError('');
    setShowSuggestions(value.length > 0);
    setSelectedIndex(-1); // Reset selection when input changes
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Tags Display */}
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 hover:scale-105 ${getTagColor(tag)}`}
            >
              <span>#{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${tag} tag`}
              >
                <svg 
                  className="w-3.5 h-3.5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>

        {/* Input Field */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => input && setShowSuggestions(true)}
            placeholder={tags.length >= maxTags ? `Maximum ${maxTags} tags reached` : placeholder}
            disabled={tags.length >= maxTags}
            className="w-full px-4 py-2.5 rounded-xl border border-sage/20 focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all duration-200 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          
          {input && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-warm-gray">
              Press Enter or comma to add
            </div>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-sage/20 shadow-lg overflow-hidden animate-scale-in"
          >
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addTag(suggestion)}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-sage/5 transition-colors flex items-center gap-2 ${
                  index === selectedIndex ? 'bg-sage/10' : ''
                }`}
              >
                <span className="text-sage">#</span>
                <span className="font-medium">{suggestion}</span>
                <span className="ml-auto text-xs text-warm-gray">
                  {suggestions.filter(s => s === suggestion).length} uses
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-500 animate-fade-in">
          {error}
        </p>
      )}

      {/* Helper Text */}
      {!error && (
        <p className="text-xs text-warm-gray">
          Use letters, numbers, hyphens, and underscores. {tags.length}/{maxTags} tags
        </p>
      )}
    </div>
  );
}