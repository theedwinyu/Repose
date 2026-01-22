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

const moodEmojis: Record<string, string> = {
  peaceful: '😌',
  content: '😊',
  neutral: '😐',
  reflective: '😔',
  heavy: '😢',
};

export default function CalendarComponent({
  entries,
  onDateClick,
  activeStartDate,
  onActiveStartDateChange,
}: CalendarComponentProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [Calendar, setCalendar] = useState<React.ComponentType<any> | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    import('react-calendar').then((mod) => {
      if (mounted) {
        setCalendar(() => mod.default);
        setIsClient(true);
      }
    });
    
    return () => {
      mounted = false;
    };
  }, []);

  const tileContent = ({ date }: { date: Date }) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const entry = entries.get(dateStr);

    if (entry) {
      const dayContent = entry.weatherContext ? moodEmojis[entry.mood] + " " + entry.title + " " + entry.weatherContext.weather.icon : moodEmojis[entry.mood] + " " + entry.title;
      return (
        <div className="flex justify-center mt-1">
          <span className="text-lg">{dayContent}</span>
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
        <div className="w-8 h-8 spinner-serene rounded-full"></div>
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
      calendarType="gregory"
      className="journal-calendar"
    />
  );
}