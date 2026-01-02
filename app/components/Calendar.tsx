'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { JournalEntry } from '@/app/types';

interface CalendarComponentProps {
  entries: Map<string, JournalEntry>;
  onDateClick: (date: Date) => void;
  activeStartDate?: Date;
  onActiveStartDateChange?: (date: Date) => void;
}

const moodEmojis = {
  happy: '😊',
  neutral: '😐',
  sad: '😢',
};

export default function CalendarComponent({
  entries,
  onDateClick,
  activeStartDate,
  onActiveStartDateChange,
}: CalendarComponentProps) {
  const [Calendar, setCalendar] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    import('react-calendar').then((mod) => {
      setCalendar(() => mod.default);
    });
  }, []);

  const tileContent = ({ date }: { date: Date }) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entry = entries.get(dateStr);

    if (entry) {
      return (
        <div className="flex justify-center mt-1">
          <span className="text-lg">{moodEmojis[entry.mood]} {entry.title}</span>
        </div>
      );
    }
    return null;
  };

  const tileClassName = ({ date }: { date: Date }) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (entries.has(dateStr)) {
      return 'has-entry';
    }
    return '';
  };

  if (!isClient || !Calendar) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Calendar
      value={new Date()}
      tileContent={tileContent}
      tileClassName={tileClassName}
      onClickDay={onDateClick}
      activeStartDate={activeStartDate}
      onActiveStartDateChange={({ activeStartDate }: { activeStartDate: Date | null }) => {
        if (activeStartDate && onActiveStartDateChange) {
          onActiveStartDateChange(activeStartDate);
        }
      }}
      className="journal-calendar"
    />
  );
}