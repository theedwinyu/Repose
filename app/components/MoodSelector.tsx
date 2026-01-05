'use client';

interface MoodSelectorProps {
  selected: 'peaceful' | 'content' | 'neutral' | 'reflective' | 'heavy' | null;
  onChange: (mood: 'peaceful' | 'content' | 'neutral' | 'reflective' | 'heavy') => void;
}

export default function MoodSelector({ selected, onChange }: MoodSelectorProps) {
  const moods: Array<{ 
    value: 'peaceful' | 'content' | 'neutral' | 'reflective' | 'heavy'; 
    emoji: string; 
    label: string; 
    borderColor: string;
    bgColor: string;
    shadowColor: string;
    description: string;
  }> = [
    { value: 'peaceful', emoji: '😌', label: 'Peaceful', borderColor: '#7FC5B8', bgColor: 'rgba(127, 197, 184, 0.15)', shadowColor: 'rgba(127, 197, 184, 0.4)', description: 'Calm, serene, at ease' },
    { value: 'content', emoji: '😊', label: 'Content', borderColor: '#6BC9C9', bgColor: 'rgba(107, 201, 201, 0.15)', shadowColor: 'rgba(107, 201, 201, 0.4)', description: 'Happy, satisfied' },
    { value: 'neutral', emoji: '😐', label: 'Neutral', borderColor: '#D8E8C4', bgColor: 'rgba(216, 232, 196, 0.2)', shadowColor: 'rgba(216, 232, 196, 0.4)', description: 'Just okay' },
    { value: 'reflective', emoji: '😔', label: 'Reflective', borderColor: '#D4C5E0', bgColor: 'rgba(212, 197, 224, 0.15)', shadowColor: 'rgba(212, 197, 224, 0.4)', description: 'Thoughtful, processing' },
    { value: 'heavy', emoji: '😢', label: 'Heavy', borderColor: '#C5D8E8', bgColor: 'rgba(197, 216, 232, 0.15)', shadowColor: 'rgba(197, 216, 232, 0.4)', description: 'Difficult, struggling' },
  ];

  return (
    <div>
      <label className="block text-sm font-semibold text-charcoal mb-3">
        How are you feeling?
      </label>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {moods.map((mood) => (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(mood.value)}
            className="py-4 px-3 rounded-xl transition-all duration-300 flex flex-col items-center gap-2 font-semibold"
            style={
              selected === mood.value
                ? {
                    backgroundColor: mood.bgColor,
                    borderWidth: '3px',
                    borderStyle: 'solid',
                    borderColor: mood.borderColor,
                    color: '#3A4A4A',
                    boxShadow: `0 4px 12px ${mood.shadowColor}, 0 0 0 1px ${mood.borderColor}`,
                  }
                : {
                    backgroundColor: '#F8F6F3',
                    borderWidth: '2px',
                    borderStyle: 'solid',
                    borderColor: 'rgba(127, 197, 184, 0.15)',
                    color: '#6B7B7B',
                  }
            }
            onMouseEnter={(e) => {
              if (selected !== mood.value) {
                e.currentTarget.style.backgroundColor = 'rgba(168, 221, 211, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(127, 197, 184, 0.3)';
                e.currentTarget.style.color = '#3A4A4A';
              }
            }}
            onMouseLeave={(e) => {
              if (selected !== mood.value) {
                e.currentTarget.style.backgroundColor = '#F8F6F3';
                e.currentTarget.style.borderColor = 'rgba(127, 197, 184, 0.15)';
                e.currentTarget.style.color = '#6B7B7B';
              }
            }}
          >
            <span className="text-3xl">{mood.emoji}</span>
            <span className="text-sm">{mood.label}</span>
          </button>
        ))}
      </div>
      {selected && (
        <p className="text-xs text-warm-gray mt-3 text-center italic">
          {moods.find(m => m.value === selected)?.description}
        </p>
      )}
    </div>
  );
}