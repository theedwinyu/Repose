// Journal Entry Types
export type Mood = 'peaceful' | 'content' | 'neutral' | 'reflective' | 'heavy';

export interface JournalEntry {
  title: string;
  mood: Mood;
  timestamp: string;
}

export interface UserConfig {
  name: string;
}

export interface JournalEntryWithBody extends JournalEntry {
  body: string;
}