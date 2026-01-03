'use client';

interface MoodSelectorProps {
  selected: 'happy' | 'sad' | 'neutral' | null;
  onChange: (mood: 'happy' | 'sad' | 'neutral') => void;
}

export default function MoodSelector({ selected, onChange }: MoodSelectorProps) {
  const moods: Array<{ value: 'happy' | 'neutral' | 'sad'; emoji: string; label: string; color: string }> = [
    { value: 'happy', emoji: '😊', label: 'Happy', color: 'sage' },
    { value: 'neutral', emoji: '😐', label: 'Neutral', color: 'sand' },
    { value: 'sad', emoji: '😢', label: 'Sad', color: 'sky' },
  ];

  return (
    <div>
      <label className="block text-sm font-semibold text-charcoal mb-3">
        How are you feeling?
      </label>
      <div className="flex gap-3">
        {moods.map((mood) => (
          <button
            key={mood.value}
            type="button"
            onClick={() => onChange(mood.value)}
            className={`flex-1 py-4 px-4 rounded-xl transition-all duration-300 flex flex-col items-center gap-2 font-semibold border-2 ${
              selected === mood.value
                ? mood.color === 'sage'
                  ? 'bg-sage/30 border-sage-dark text-charcoal shadow-serene scale-105'
                  : mood.color === 'sand'
                  ? 'bg-sand/30 border-sand-dark text-charcoal shadow-serene scale-105'
                  : 'bg-sky/30 border-sky-dark text-charcoal shadow-serene scale-105'
                : 'bg-soft-white border-sage/15 text-warm-gray hover:bg-sage-light/20 hover:border-sage/30 hover:text-charcoal'
            }`}
          >
            <span className="text-3xl">{mood.emoji}</span>
            <span className="text-sm">{mood.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}