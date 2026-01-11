'use client';

import React from 'react';
import { WeatherContext } from '../types';

interface WeatherDisplayProps {
  weatherContext: WeatherContext;
  className?: string;
  showLocation?: boolean;
  showWeather?: boolean;
}

export default function WeatherDisplay({ 
  weatherContext, 
  className = '',
  showLocation = true,
  showWeather = true 
}: WeatherDisplayProps) {
  const { location, weather } = weatherContext;
  
  const locationStr = location.region 
    ? `${location.city}, ${location.region}`
    : location.city;
  
  return (
    <div className={`flex items-center gap-3 text-sm text-warm-gray ${className}`}>
      {showLocation && (
        <>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{locationStr}</span>
          </span>
          {showWeather && <span>•</span>}
        </>
      )}
      
      {showWeather && (
        <span className="flex items-center gap-1.5" title={weather.description}>
          <span className="text-lg">{weather.icon}</span>
          <span>{weather.temp}°F</span>
          <span className="text-light-muted">{weather.condition}</span>
        </span>
      )}
    </div>
  );
}