'use client';

import React from 'react';
import { getTagColor } from '@/app/types';

interface TagFilterProps {
  selectedTags: string[];
  onRemoveTag: (tag: string) => void;
  onClearAll: () => void;
}

export default function TagFilter({
  selectedTags,
  onRemoveTag,
  onClearAll
}: TagFilterProps) {
  if (selectedTags.length === 0) {
    return null;
  }

  return (
    <div className="bg-sage/5 rounded-2xl p-4 border border-sage/20 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-charcoal">Active Filters</h4>
        
        <button
          onClick={onClearAll}
          className="text-xs text-warm-gray hover:text-sage transition-colors font-medium"
        >
          Clear all
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${getTagColor(tag)}`}
          >
            <span>#{tag}</span>
            <button
              onClick={() => onRemoveTag(tag)}
              className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
              aria-label={`Remove ${tag} filter`}
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

      <p className="text-xs text-warm-gray mt-3">
        Showing entries with any of these tags
      </p>
    </div>
  );
}