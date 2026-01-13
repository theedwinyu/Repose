'use client';

import React, { useMemo, useState } from 'react';
import { JournalEntry, getTagColor, TagStats } from '@/app/types';
import { format } from 'date-fns';

interface TagManagementProps {
  entries: Map<string, JournalEntry>;
  onRenameTag: (oldTag: string, newTag: string) => Promise<void>;
  onDeleteTag: (tag: string) => Promise<void>;
  onMergeTags: (tags: string[], newTag: string) => Promise<void>;
  onClose: () => void;
}

export default function TagManagement({
  entries,
  onRenameTag,
  onDeleteTag,
  onMergeTags,
  onClose
}: TagManagementProps) {
  const [sortBy, setSortBy] = useState<'name' | 'count' | 'recent'>('count');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mergeTarget, setMergeTarget] = useState('');
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const tagStats: TagStats[] = useMemo(() => {
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
        if (entry.timestamp > tagStat.lastUsed) {
          tagStat.lastUsed = entry.timestamp;
        }
      });
    });

    return Array.from(stats.values()).sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'count':
          return b.count - a.count;
        case 'recent':
          return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
        default:
          return 0;
      }
    });
  }, [entries, sortBy]);

  const handleRename = async (oldTag: string) => {
    if (!newTagName.trim() || newTagName === oldTag) {
      setEditingTag(null);
      return;
    }

    setIsProcessing(true);
    try {
      await onRenameTag(oldTag, newTagName.toLowerCase().trim());
      setEditingTag(null);
      setNewTagName('');
      setSelectedTags([]); // Clear selections after rename
    } catch {
      alert('Failed to rename tag');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (tag: string) => {
    if (!confirm(`Delete tag "${tag}"? This will remove it from ${tagStats.find(t => t.name === tag)?.count || 0} entries.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await onDeleteTag(tag);
      setSelectedTags(prev => prev.filter(t => t !== tag)); // Remove deleted tag from selection
    } catch {
      alert('Failed to delete tag');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMerge = async () => {
    if (selectedTags.length < 2) {
      alert('Select at least 2 tags to merge');
      return;
    }

    if (!mergeTarget.trim()) {
      alert('Enter a target tag name');
      return;
    }

    setIsProcessing(true);
    try {
      await onMergeTags(selectedTags, mergeTarget.toLowerCase().trim());
      setSelectedTags([]);
      setMergeTarget('');
      setShowMergeDialog(false);
    } catch {
      alert('Failed to merge tags');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleTagSelection = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="border-b border-sage/20 p-6 flex items-center justify-between bg-sage/5">
          <div>
            <h2 className="text-2xl font-bold text-charcoal" style={{ fontFamily: 'var(--font-display)' }}>
              Tag Management
            </h2>
            <p className="text-sm text-warm-gray mt-1">
              {tagStats.length} tags across {entries.size} entries
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-xl transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6 text-warm-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-sage/20 space-y-4">
          <div className="flex items-center gap-4 flex-wrap justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-charcoal">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'count' | 'recent')}
                className="px-3 py-1.5 rounded-lg border border-sage/20 text-sm focus:border-sage focus:ring-2 focus:ring-sage/20"
              >
                <option value="count">Usage Count</option>
                <option value="name">Name (A-Z)</option>
                <option value="recent">Recently Used</option>
              </select>
            </div>

            {selectedTags.length >= 2 && (
              <button
                onClick={() => setShowMergeDialog(true)}
                className="px-4 py-2 bg-sage rounded-lg font-medium hover:bg-sage-dark transition-colors shadow-sm text-charcoal"
              >
                Merge {selectedTags.length} tags
              </button>
            )}
          </div>

          {selectedTags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap bg-sage/5 rounded-lg p-3">
              <span className="text-sm text-charcoal font-medium">Selected ({selectedTags.length}):</span>
              {selectedTags.map(tag => (
                <span key={tag} className={`px-2 py-1 rounded-full text-xs font-medium ${getTagColor(tag)}`}>
                  #{tag}
                </span>
              ))}
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-sage hover:text-sage-dark ml-2 font-medium"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>

        {/* Tag List */}
        <div className="overflow-y-auto max-h-[calc(90vh-300px)]">
          {tagStats.length === 0 ? (
            <div className="text-center py-12 text-warm-gray">
              <div className="text-5xl mb-3 opacity-30">🏷️</div>
              <p>No tags found</p>
            </div>
          ) : (
            <div className="divide-y divide-sage/10">
              {tagStats.map((tag) => (
                <div
                  key={tag.name}
                  className="p-4 hover:bg-sage/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.name)}
                      onChange={() => toggleTagSelection(tag.name)}
                      className="w-4 h-4 text-sage rounded border-sage/30 focus:ring-sage"
                    />

                    {editingTag === tag.name ? (
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        onBlur={() => handleRename(tag.name)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(tag.name);
                          if (e.key === 'Escape') {
                            setEditingTag(null);
                            setNewTagName('');
                          }
                        }}
                        autoFocus
                        className="px-2 py-1 border border-sage rounded text-sm"
                      />
                    ) : (
                      <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getTagColor(tag.name)}`}>
                        #{tag.name}
                      </span>
                    )}

                    <div className="flex-1 flex items-center gap-6 text-sm text-warm-gray">
                      <span>{tag.count} {tag.count === 1 ? 'entry' : 'entries'}</span>
                      <span>Last used {format(new Date(tag.lastUsed), 'MMM d, yyyy')}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingTag(tag.name);
                          setNewTagName(tag.name);
                        }}
                        disabled={isProcessing}
                        className="p-2 hover:bg-sage/10 rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Rename tag"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(tag.name)}
                        disabled={isProcessing}
                        className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Delete tag"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Merge Dialog */}
      {showMergeDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <h3 className="text-xl font-bold text-charcoal mb-4">Merge Tags</h3>
            <p className="text-sm text-warm-gray mb-4">
              Merging {selectedTags.length} tags into a single tag. All entries will be updated.
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-sm font-medium text-charcoal mb-1 block">Tags to merge:</label>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map(tag => (
                    <span key={tag} className={`px-2 py-1 rounded-full text-xs font-medium ${getTagColor(tag)}`}>
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-charcoal mb-1 block">New tag name:</label>
                <input
                  type="text"
                  value={mergeTarget}
                  onChange={(e) => setMergeTarget(e.target.value)}
                  placeholder="Enter new tag name"
                  className="w-full px-3 py-2 border border-sage/20 rounded-lg focus:border-sage focus:ring-2 focus:ring-sage/20"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMergeDialog(false);
                  setMergeTarget('');
                }}
                className="flex-1 px-4 py-2 border border-sage/20 rounded-lg font-medium hover:bg-sage/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMerge}
                disabled={!mergeTarget.trim() || isProcessing}
                className="flex-1 px-4 py-2 bg-sage rounded-lg font-medium hover:bg-sage-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-charcoal"
              >
                {isProcessing ? 'Merging...' : 'Merge Tags'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}