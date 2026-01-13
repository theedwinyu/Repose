// types.ts
// Updated with weather context support and tagging system

export type Mood = 'peaceful' | 'content' | 'neutral' | 'reflective' | 'heavy';

export interface WeatherData {
  condition: string;
  description: string;
  temp: number;
  icon: string;
  humidity?: number;
  windSpeed?: number;
}

export interface LocationData {
  city: string;
  region: string;
  country: string;
}

export interface WeatherContext {
  location: LocationData;
  weather: WeatherData;
  timestamp: string;
}

export interface JournalEntry {
  title: string;
  mood: Mood;
  timestamp: string;
  weatherContext?: WeatherContext;  // Optional weather + location data
  tags?: string[];  // Optional tags for organization
  createdAt?: string;  // ISO timestamp of when entry was created
  updatedAt?: string;  // ISO timestamp of last update
}

export interface UserConfig {
  name: string;
  autoWeather?: boolean;  // User preference for auto-fetching weather
}

export interface JournalEntryWithBody extends JournalEntry {
  body: string;
}

// Tag-related types
export interface TagStats {
  name: string;
  count: number;
  lastUsed: string;
  entries: string[];
}

// Tag color assignment - deterministic color based on tag name
export const getTagColor = (tag: string): string => {
  const colors = [
    'bg-sage/10 text-sage-dark border-sage/30',
    'bg-aqua/10 text-aqua-dark border-aqua/30',
    'bg-sky/10 text-sky-dark border-sky/30',
    'bg-lavender/10 text-lavender-dark border-lavender/30',
    'bg-sand/10 text-sand-dark border-sand/30',
    'bg-sage-light/10 text-sage border-sage/30',
  ];
  
  // Simple hash function to get consistent color for each tag
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Tag validation
export const validateTag = (tag: string): { valid: boolean; error?: string } => {
  if (!tag || tag.trim().length === 0) {
    return { valid: false, error: 'Tag cannot be empty' };
  }
  
  if (tag.length > 30) {
    return { valid: false, error: 'Tag must be 30 characters or less' };
  }
  
  if (!/^[a-z0-9_-]+$/.test(tag)) {
    return { valid: false, error: 'Tag can only contain lowercase letters, numbers, hyphens, and underscores' };
  }
  
  return { valid: true };
};

// Normalize tag for storage
export const normalizeTag = (tag: string): string => {
  return tag.toLowerCase().trim().replace(/\s+/g, '-');
};