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
 * Get current weather data using Open-Meteo
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
 * Get historical weather for a specific date using Open-Meteo Archive API
 * Works for any date from 1940 to present
 * 
 * @param lat Latitude
 * @param lon Longitude  
 * @param dateStr Date in YYYY-MM-DD format
 */
async function getHistoricalWeather(lat: number, lon: number, dateStr: string): Promise<WeatherData> {
  try {
    // Calculate how many days ago this date was
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let apiUrl: string;
    
    if (daysDiff <= 7 && daysDiff >= 0) {
      // Recent past (within 7 days) - use forecast API with past_days parameter
      // This is faster and includes more detailed data
      apiUrl = `https://api.open-meteo.com/v1/forecast?` +
        `latitude=${lat}&longitude=${lon}&` +
        `past_days=7&` +
        `daily=temperature_2m_max,temperature_2m_min,weather_code&` +
        `temperature_unit=fahrenheit&` +
        `timezone=auto`;
    } else if (daysDiff > 7) {
      // Older past (> 7 days ago) - use archive API
      // Goes back to 1940!
      apiUrl = `https://archive-api.open-meteo.com/v1/archive?` +
        `latitude=${lat}&longitude=${lon}&` +
        `start_date=${dateStr}&end_date=${dateStr}&` +
        `daily=temperature_2m_max,temperature_2m_min,weather_code&` +
        `temperature_unit=fahrenheit&` +
        `timezone=auto`;
    } else {
      // Future date - shouldn't happen, but fall back to current weather
      return getWeatherFromOpenMeteo(lat, lon);
    }
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch historical weather: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Find the specific date in the response
    const dayIndex = data.daily.time.findIndex((t: string) => t === dateStr);
    
    if (dayIndex === -1) {
      throw new Error(`Date ${dateStr} not found in weather data`);
    }
    
    const weatherCode = data.daily.weather_code[dayIndex];
    const tempMax = data.daily.temperature_2m_max[dayIndex];
    const tempMin = data.daily.temperature_2m_min[dayIndex];
    
    // Use average of max and min for historical weather
    const avgTemp = Math.round((tempMax + tempMin) / 2);
    
    const weatherInfo = weatherCodeToIcon[weatherCode] || {
      condition: 'Unknown',
      icon: '🌤️',
      description: 'unknown',
    };
    
    return {
      condition: weatherInfo.condition,
      description: weatherInfo.description,
      temp: avgTemp,
      icon: weatherInfo.icon,
      // Historical data doesn't include humidity/wind
      // These will be undefined, which is fine
    };
  } catch (error) {
    console.error('Error fetching historical weather:', error);
    throw error;
  }
}

/**
 * Get complete weather context (location + weather) for TODAY
 * This is for new entries being created right now
 * 
 * Steps:
 * 1. Get browser geolocation (asks user permission)
 * 2. Reverse geocode to get city name (BigDataCloud)
 * 3. Fetch current weather (Open-Meteo)
 */
export async function getWeatherContext(): Promise<WeatherContext> {
  try {
    // Step 1: Get GPS coordinates from browser
    const coords = await getBrowserLocation();

    // Step 2: Convert coordinates to city name
    const location = await reverseGeocode(coords.latitude, coords.longitude);

    // Step 3: Get current weather for those coordinates
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
 * Get weather context for a SPECIFIC DATE (past, present, or future)
 * Automatically chooses the right API based on the date
 * 
 * For today: Uses current weather
 * For past dates: Uses historical weather from archive
 * 
 * @param dateStr Date in YYYY-MM-DD format
 */
export async function getWeatherContextForDate(dateStr: string): Promise<WeatherContext> {
  try {
    // Step 1: Get GPS coordinates from browser
    const coords = await getBrowserLocation();

    // Step 2: Convert coordinates to city name
    const location = await reverseGeocode(coords.latitude, coords.longitude);

    // Step 3: Determine if this is today or a past date
    const targetDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    
    const isToday = targetDate.getTime() === today.getTime();
    
    let weather: WeatherData;
    
    if (isToday) {
      // Use current weather for today
      weather = await getWeatherFromOpenMeteo(coords.latitude, coords.longitude);
    } else {
      // Use historical weather for past dates
      weather = await getHistoricalWeather(coords.latitude, coords.longitude, dateStr);
    }

    return {
      location,
      weather,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching weather context for date:', error);
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