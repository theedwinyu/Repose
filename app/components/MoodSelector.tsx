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
    color: string;
    description: string;
  }> = [
    { value: 'peaceful', emoji: '😌', label: 'Peaceful', color: 'sage', description: 'Calm, serene, at ease' },
    { value: 'content', emoji: '😊', label: 'Content', color: 'aqua', description: 'Happy, satisfied' },
    { value: 'neutral', emoji: '😐', label: 'Neutral', color: 'sand', description: 'Just okay' },
    { value: 'reflective', emoji: '😔', label: 'Reflective', color: 'lavender', description: 'Thoughtful, processing' },
    { value: 'heavy', emoji: '😢', label: 'Heavy', color: 'sky', description: 'Difficult, struggling' },
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
            className={`py-4 px-3 rounded-xl transition-all duration-300 flex flex-col items-center gap-2 font-semibold border-2 ${
              selected === mood.value
                ? mood.color === 'sage'
                  ? 'bg-sage/30 border-sage-dark text-charcoal shadow-serene scale-105'
                  : mood.color === 'aqua'
                  ? 'bg-aqua/30 border-aqua-dark text-charcoal shadow-serene scale-105'
                  : mood.color === 'sand'
                  ? 'bg-sand/30 border-sand-dark text-charcoal shadow-serene scale-105'
                  : mood.color === 'lavender'
                  ? 'bg-lavender/30 border-lavender-dark text-charcoal shadow-serene scale-105'
                  : 'bg-sky/30 border-sky-dark text-charcoal shadow-serene scale-105'
                : 'bg-soft-white border-sage/15 text-warm-gray hover:bg-sage-light/20 hover:border-sage/30 hover:text-charcoal'
            }`}
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