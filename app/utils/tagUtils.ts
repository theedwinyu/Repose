// app/utils/tagUtils.ts
import { JournalEntry, TagStats, normalizeTag } from '@/app/types';

/**
 * Get all unique tags from entries
 */
export function getAllTags(entries: Map<string, JournalEntry>): string[] {
  const tagsSet = new Set<string>();
  
  entries.forEach((entry) => {
    entry.tags?.forEach((tag) => tagsSet.add(tag));
  });
  
  return Array.from(tagsSet).sort();
}

/**
 * Get tag statistics with usage count and last used date
 */
export function getTagStats(entries: Map<string, JournalEntry>): Map<string, TagStats> {
  const stats = new Map<string, TagStats>();
  
  entries.forEach((entry, id) => {
    entry.tags?.forEach((tag) => {
      if (!stats.has(tag)) {
        stats.set(tag, {
          name: tag,
          count: 0,
          lastUsed: entry.timestamp,
          entries: []
        });
      }
      
      const tagStat = stats.get(tag)!;
      tagStat.count++;
      tagStat.entries.push(id);
      
      // Update last used if this entry is more recent
      if (entry.timestamp > tagStat.lastUsed) {
        tagStat.lastUsed = entry.timestamp;
      }
    });
  });
  
  return stats;
}

/**
 * Get suggested tags based on frequency and recency
 */
export function getSuggestedTags(
  entries: Map<string, JournalEntry>, 
  limit: number = 10
): string[] {
  const stats = getTagStats(entries);
  
  // Sort by a combination of frequency and recency
  return Array.from(stats.values())
    .sort((a, b) => {
      // Weight: 70% frequency, 30% recency
      const aScore = a.count * 0.7 + (new Date(a.lastUsed).getTime() / 1000000000) * 0.3;
      const bScore = b.count * 0.7 + (new Date(b.lastUsed).getTime() / 1000000000) * 0.3;
      return bScore - aScore;
    })
    .slice(0, limit)
    .map(stat => stat.name);
}

/**
 * Filter entries by tags with AND/OR logic
 */
export function filterEntriesByTags(
  entries: Map<string, JournalEntry>,
  tags: string[],
  operator: 'AND' | 'OR' = 'OR'
): Map<string, JournalEntry> {
  if (tags.length === 0) {
    return entries;
  }
  
  const normalizedTags = tags.map(normalizeTag);
  const filtered = new Map<string, JournalEntry>();
  
  entries.forEach((entry, id) => {
    const entryTags = entry.tags?.map(normalizeTag) || [];
    
    let matches = false;
    if (operator === 'AND') {
      // Entry must have ALL tags
      matches = normalizedTags.every(tag => entryTags.includes(tag));
    } else {
      // Entry must have AT LEAST ONE tag
      matches = normalizedTags.some(tag => entryTags.includes(tag));
    }
    
    if (matches) {
      filtered.set(id, entry);
    }
  });
  
  return filtered;
}

/**
 * Rename a tag across all entries
 */
export function renameTagInEntries(
  entries: Map<string, JournalEntry>,
  oldTag: string,
  newTag: string
): Map<string, JournalEntry> {
  const oldTagNorm = normalizeTag(oldTag);
  const newTagNorm = normalizeTag(newTag);
  
  if (oldTagNorm === newTagNorm) {
    return entries;
  }
  
  const updated = new Map<string, JournalEntry>();
  
  entries.forEach((entry, id) => {
    if (entry.tags?.includes(oldTagNorm)) {
      const updatedEntry = {
        ...entry,
        tags: entry.tags
          .map(tag => tag === oldTagNorm ? newTagNorm : tag)
          .filter((tag, index, self) => self.indexOf(tag) === index), // Remove duplicates
        updatedAt: new Date().toISOString()
      };
      updated.set(id, updatedEntry);
    }
  });
  
  return updated;
}

/**
 * Delete a tag from all entries
 */
export function deleteTagFromEntries(
  entries: Map<string, JournalEntry>,
  tagToDelete: string
): Map<string, JournalEntry> {
  const tagNorm = normalizeTag(tagToDelete);
  const updated = new Map<string, JournalEntry>();
  
  entries.forEach((entry, id) => {
    if (entry.tags?.includes(tagNorm)) {
      const updatedEntry = {
        ...entry,
        tags: entry.tags.filter(tag => tag !== tagNorm),
        updatedAt: new Date().toISOString()
      };
      updated.set(id, updatedEntry);
    }
  });
  
  return updated;
}

/**
 * Merge multiple tags into a single tag
 */
export function mergeTagsInEntries(
  entries: Map<string, JournalEntry>,
  tagsToMerge: string[],
  targetTag: string
): Map<string, JournalEntry> {
  const tagsNorm = tagsToMerge.map(normalizeTag);
  const targetNorm = normalizeTag(targetTag);
  const updated = new Map<string, JournalEntry>();
  
  entries.forEach((entry, id) => {
    const hasAnyTag = entry.tags?.some(tag => tagsNorm.includes(tag));
    
    if (hasAnyTag) {
      const updatedEntry = {
        ...entry,
        tags: [
          // Keep tags that aren't being merged
          ...entry.tags!.filter(tag => !tagsNorm.includes(tag)),
          // Add target tag
          targetNorm
        ].filter((tag, index, self) => self.indexOf(tag) === index), // Remove duplicates
        updatedAt: new Date().toISOString()
      };
      updated.set(id, updatedEntry);
    }
  });
  
  return updated;
}

/**
 * Get related tags (tags that often appear together)
 */
export function getRelatedTags(
  entries: Map<string, JournalEntry>,
  targetTag: string,
  limit: number = 5
): string[] {
  const targetNorm = normalizeTag(targetTag);
  const coOccurrence = new Map<string, number>();
  
  entries.forEach((entry) => {
    if (entry.tags?.includes(targetNorm)) {
      entry.tags.forEach((tag) => {
        if (tag !== targetNorm) {
          coOccurrence.set(tag, (coOccurrence.get(tag) || 0) + 1);
        }
      });
    }
  });
  
  return Array.from(coOccurrence.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

/**
 * Get tag usage by mood
 */
export function getTagsByMood(
  entries: Map<string, JournalEntry>
): Map<string, Map<string, number>> {
  const tagMoodMap = new Map<string, Map<string, number>>();
  
  entries.forEach((entry) => {
    const mood = entry.mood || 'neutral';
    entry.tags?.forEach((tag) => {
      if (!tagMoodMap.has(tag)) {
        tagMoodMap.set(tag, new Map());
      }
      const moodMap = tagMoodMap.get(tag)!;
      moodMap.set(mood, (moodMap.get(mood) || 0) + 1);
    });
  });
  
  return tagMoodMap;
}

/**
 * Search entries by tag with fuzzy matching
 */
export function fuzzySearchTags(
  availableTags: string[],
  query: string,
  limit: number = 5
): string[] {
  if (!query.trim()) {
    return [];
  }
  
  const queryLower = query.toLowerCase();
  
  return availableTags
    .filter(tag => tag.toLowerCase().includes(queryLower))
    .sort((a, b) => {
      // Prioritize tags that start with the query
      const aStarts = a.toLowerCase().startsWith(queryLower);
      const bStarts = b.toLowerCase().startsWith(queryLower);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Then sort by length (shorter first)
      return a.length - b.length;
    })
    .slice(0, limit);
}