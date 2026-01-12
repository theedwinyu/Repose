// app/types.ts
export type Mood = 'peaceful' | 'happy' | 'neutral' | 'sad' | 'stressed' | undefined;

export interface WeatherContext {
  temperature?: number;
  condition?: string;
  location?: string;
  icon?: string;
}

export interface JournalEntry {
  title: string;
  mood: Mood;
  timestamp: string;
  weatherContext?: WeatherContext;
  tags?: string[];  // New: Tag support
  createdAt?: string;  // New: Track creation time
  updatedAt?: string;  // New: Track last update time
}

export interface UserConfig {
  name: string;
  autoWeather?: boolean;
}

export interface JournalEntryWithBody extends JournalEntry {
  body: string;
}

// New: Tag statistics and management
export interface TagStats {
  name: string;
  count: number;
  lastUsed: string;
  entries: string[];  // Array of entry IDs (dates)
}

export interface TagFilter {
  tags: string[];
  operator: 'AND' | 'OR';
}

// New: Tag color mapping (deterministic based on tag name)
export const getTagColor = (tag: string): string => {
  const colors = [
    'bg-sage/20 text-sage-dark border-sage/30',
    'bg-sky/20 text-sky-dark border-sky/30',
    'bg-aqua/20 text-aqua-dark border-aqua/30',
    'bg-lavender/20 text-lavender-dark border-lavender/30',
    'bg-sand/20 text-sand-dark border-sand/30',
    'bg-rose/20 text-rose-dark border-rose/30',
  ];
  
  // Generate consistent color based on tag name
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// New: Tag validation
export const validateTag = (tag: string): { valid: boolean; error?: string } => {
  if (!tag || tag.trim().length === 0) {
    return { valid: false, error: 'Tag cannot be empty' };
  }
  
  if (tag.length > 30) {
    return { valid: false, error: 'Tag must be 30 characters or less' };
  }
  
  // Allow letters, numbers, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(tag)) {
    return { valid: false, error: 'Tag can only contain letters, numbers, hyphens, and underscores' };
  }
  
  return { valid: true };
};

// New: Normalize tag (lowercase, trim)
export const normalizeTag = (tag: string): string => {
  return tag.toLowerCase().trim();
};