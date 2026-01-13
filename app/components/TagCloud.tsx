'use client';

import { useMemo } from 'react';
import { JournalEntry, getTagColor } from '@/app/types';

interface TagWithStats {
  name: string;
  count: number;
  size: number;
}

interface TagCloudProps {
  entries: Map<string, JournalEntry>;
  onTagClick?: (tag: string) => void;
  selectedTags?: string[];
  maxTags?: number;
}

export default function TagCloud({ 
  entries, 
  onTagClick, 
  selectedTags = [],
  maxTags = 30 
}: TagCloudProps) {
  const tagStats = useMemo(() => {
    const stats = new Map<string, number>();
    
    entries.forEach((entry) => {
      entry.tags?.forEach((tag) => {
        stats.set(tag, (stats.get(tag) || 0) + 1);
      });
    });

    // Convert to array and sort by count
    const sortedTags: TagWithStats[] = Array.from(stats.entries())
      .map(([name, count]) => ({
        name,
        count,
        size: 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, maxTags);

    // Calculate sizes (1-4 scale)
    if (sortedTags.length > 0) {
      const maxCount = sortedTags[0].count;
      const minCount = sortedTags[sortedTags.length - 1].count;
      const range = maxCount - minCount || 1;

      sortedTags.forEach(tag => {
        tag.size = Math.floor(((tag.count - minCount) / range) * 3) + 1;
      });
    }

    return sortedTags;
  }, [entries, maxTags]);

  if (tagStats.length === 0) {
    return (
      <div className="text-center py-8 text-warm-gray">
        <div className="text-4xl mb-3 opacity-30">🏷️</div>
        <p className="text-sm">No tags yet</p>
        <p className="text-xs mt-1 opacity-70">Add tags to your entries to see them here</p>
      </div>
    );
  }

  const getSizeClass = (size: number) => {
    switch (size) {
      case 1: return 'text-sm';
      case 2: return 'text-base';
      case 3: return 'text-lg';
      case 4: return 'text-xl';
      default: return 'text-sm';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-charcoal">Tag Cloud</h3>
        <span className="text-xs text-warm-gray">{tagStats.length} tags</span>
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-center py-4">
        {tagStats.map((tag) => {
          const isSelected = selectedTags.includes(tag.name);
          return (
            <button
              key={tag.name}
              onClick={() => onTagClick?.(tag.name)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all duration-200 hover:scale-105 border-2 ${getSizeClass(tag.size)} ${
                isSelected 
                  ? 'bg-soft-white text-charcoal border-sage shadow-md scale-105' 
                  : `${getTagColor(tag.name)} hover:shadow-sm`
              }`}
            >
              <span>#{tag.name}</span>
              <span className={`text-xs ${isSelected ? 'opacity-60' : 'opacity-70'}`}>({tag.count})</span>
              {isSelected && (
                <svg className="w-3.5 h-3.5 text-sage" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}