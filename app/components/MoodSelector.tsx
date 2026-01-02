'use client';

import React from 'react';

interface MoodSelectorProps {
  selected: 'happy' | 'sad' | 'neutral' | null;
  onChange: (mood: 'happy' | 'sad' | 'neutral') => void;
}

const moods = [
  { value: 'happy' as const, emoji: '😊', label: 'Happy', color: 'green' },
  { value: 'neutral' as const, emoji: '😐', label: 'Neutral', color: 'yellow' },
  { value: 'sad' as const, emoji: '😢', label: 'Sad', color: 'blue' },
];

export default function MoodSelector({ selected, onChange }: MoodSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-300 mb-2">
        How are you feeling today?
      </label>
      <div className="flex gap-3">
        {moods.map((mood) => {
          const isSelected = selected === mood.value;
          return (
            <button
              key={mood.value}
              onClick={() => onChange(mood.value)}
              className={`
                flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all
                ${
                  isSelected
                    ? `bg-${mood.color}-900/40 border-${mood.color}-700 scale-105 shadow-md`
                    : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                }
              `}
            >
              <span className="text-3xl">{mood.emoji}</span>
              <span className={`text-sm font-medium ${isSelected ? 'text-zinc-100' : 'text-zinc-400'}`}>
                {mood.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}