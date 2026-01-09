// types.ts
// Updated with weather context support

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
}

export interface UserConfig {
  name: string;
  autoWeather?: boolean;  // User preference for auto-fetching weather
}

export interface JournalEntryWithBody extends JournalEntry {
  body: string;
}