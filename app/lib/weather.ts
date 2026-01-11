// lib/weather.ts
// Weather and location tracking using browser geolocation + free APIs
// NO API KEYS REQUIRED!

export interface WeatherData {
  condition: string;      // "Clear", "Rain", "Clouds", etc.
  description: string;    // "clear sky", "light rain", etc.
  temp: number;          // Temperature in Fahrenheit
  icon: string;          // Emoji icon
  humidity?: number;     // Humidity percentage
  windSpeed?: number;    // Wind speed in mph
}

export interface LocationData {
  city: string;          // "Brooklyn"
  region: string;        // "New York"
  country: string;       // "United States"
}

export interface WeatherContext {
  location: LocationData;
  weather: WeatherData;
  timestamp: string;     // When this data was fetched
}

// WMO Weather codes to emoji mapping
// https://open-meteo.com/en/docs
const weatherCodeToIcon: Record<number, { condition: string; icon: string; description: string }> = {
  0: { condition: 'Clear', icon: '☀️', description: 'clear sky' },
  1: { condition: 'Mostly Clear', icon: '🌤️', description: 'mainly clear' },
  2: { condition: 'Partly Cloudy', icon: '⛅', description: 'partly cloudy' },
  3: { condition: 'Cloudy', icon: '☁️', description: 'overcast' },
  45: { condition: 'Foggy', icon: '🌫️', description: 'fog' },
  48: { condition: 'Foggy', icon: '🌫️', description: 'depositing rime fog' },
  51: { condition: 'Drizzle', icon: '🌦️', description: 'light drizzle' },
  53: { condition: 'Drizzle', icon: '🌦️', description: 'moderate drizzle' },
  55: { condition: 'Drizzle', icon: '🌦️', description: 'dense drizzle' },
  56: { condition: 'Freezing Drizzle', icon: '🌨️', description: 'light freezing drizzle' },
  57: { condition: 'Freezing Drizzle', icon: '🌨️', description: 'dense freezing drizzle' },
  61: { condition: 'Rain', icon: '🌧️', description: 'slight rain' },
  63: { condition: 'Rain', icon: '🌧️', description: 'moderate rain' },
  65: { condition: 'Rain', icon: '🌧️', description: 'heavy rain' },
  66: { condition: 'Freezing Rain', icon: '🌨️', description: 'light freezing rain' },
  67: { condition: 'Freezing Rain', icon: '🌨️', description: 'heavy freezing rain' },
  71: { condition: 'Snow', icon: '🌨️', description: 'slight snow' },
  73: { condition: 'Snow', icon: '❄️', description: 'moderate snow' },
  75: { condition: 'Snow', icon: '❄️', description: 'heavy snow' },
  77: { condition: 'Snow', icon: '🌨️', description: 'snow grains' },
  80: { condition: 'Rain Showers', icon: '🌦️', description: 'slight rain showers' },
  81: { condition: 'Rain Showers', icon: '🌧️', description: 'moderate rain showers' },
  82: { condition: 'Rain Showers', icon: '🌧️', description: 'violent rain showers' },
  85: { condition: 'Snow Showers', icon: '🌨️', description: 'slight snow showers' },
  86: { condition: 'Snow Showers', icon: '❄️', description: 'heavy snow showers' },
  95: { condition: 'Thunderstorm', icon: '⛈️', description: 'thunderstorm' },
  96: { condition: 'Thunderstorm', icon: '⛈️', description: 'thunderstorm with slight hail' },
  99: { condition: 'Thunderstorm', icon: '⛈️', description: 'thunderstorm with heavy hail' },
};

/**
 * Get user's current location using browser geolocation API
 * Requires user permission
 */
async function getBrowserLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (error) => {
        let message = 'Location access denied';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: false, // Don't need GPS-level accuracy
        timeout: 10000,           // 10 second timeout
        maximumAge: 300000,       // Accept 5-minute-old cache
      }
    );
  });
}

/**
 * Reverse geocode coordinates to city name using BigDataCloud
 * Free, no API key required
 * https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api
 */
async function reverseGeocode(lat: number, lon: number): Promise<LocationData> {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );

    if (!response.ok) {
      throw new Error('Failed to reverse geocode');
    }

    const data = await response.json();

    return {
      city: data.city || data.locality || 'Unknown',
      region: data.principalSubdivision || '',
      country: data.countryName || 'Unknown',
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    throw new Error('Could not determine location name');
  }
}

/**
 * Get weather data using Open-Meteo
 * 100% free, no API key required, no rate limits
 * https://open-meteo.com/en/docs
 */
async function getWeatherFromOpenMeteo(lat: number, lon: number): Promise<WeatherData> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch weather');
    }

    const data = await response.json();
    const current = data.current;

    const weatherCode = current.weather_code || 0;
    const weatherInfo = weatherCodeToIcon[weatherCode] || {
      condition: 'Unknown',
      icon: '🌤️',
      description: 'unknown',
    };

    return {
      condition: weatherInfo.condition,
      description: weatherInfo.description,
      temp: Math.round(current.temperature_2m),
      icon: weatherInfo.icon,
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    throw new Error('Could not fetch weather');
  }
}

/**
 * Get complete weather context (location + weather)
 * This is the main function to call when creating a new entry
 * 
 * Steps:
 * 1. Get browser geolocation (asks user permission)
 * 2. Reverse geocode to get city name (BigDataCloud)
 * 3. Fetch weather (Open-Meteo)
 */
export async function getWeatherContext(): Promise<WeatherContext> {
  try {
    // Step 1: Get GPS coordinates from browser
    const coords = await getBrowserLocation();

    // Step 2: Convert coordinates to city name
    const location = await reverseGeocode(coords.latitude, coords.longitude);

    // Step 3: Get weather for those coordinates
    const weather = await getWeatherFromOpenMeteo(coords.latitude, coords.longitude);

    return {
      location,
      weather,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching weather context:', error);
    throw error;
  }
}

/**
 * Check if browser supports geolocation
 */
export function isGeolocationSupported(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Format weather context for display
 */
export function formatWeatherContext(context: WeatherContext): string {
  const { location, weather } = context;
  const locationStr = location.region 
    ? `${location.city}, ${location.region}`
    : location.city;
  
  return `${locationStr} • ${weather.icon} ${weather.temp}°F, ${weather.condition}`;
}

/**
 * Format just the location for display
 */
export function formatLocation(location: LocationData): string {
  return location.region 
    ? `${location.city}, ${location.region}`
    : location.city;
}

/**
 * Format just the weather for display
 */
export function formatWeather(weather: WeatherData): string {
  return `${weather.icon} ${weather.temp}°F, ${weather.condition}`;
}