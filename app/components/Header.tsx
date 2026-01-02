'use client';

import React from 'react';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export default function Header({ title, showBackButton = false, onBack }: HeaderProps) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900 p-4">
      <div className="max-w-7xl mx-auto flex items-center gap-4">
        {showBackButton && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Back</span>
          </button>
        )}
        <h1 className="text-2xl font-bold text-zinc-100">{title}</h1>
      </div>
    </header>
  );
}