import type { GameMode } from '../types/game';

interface ModeSelectorProps {
  mode: GameMode;
  onChange: (mode: GameMode) => void;
}

const options: { value: GameMode; label: string; description: string }[] = [
  { value: 'local', label: 'Hot-seat', description: 'Pass-and-play on one device.' },
  { value: 'ai-easy', label: 'Solo (Easy)', description: 'Practice against a playful AI.' },
  { value: 'ai-hard', label: 'Solo (Hard)', description: 'Challenge a more tactical AI.' },
  { value: 'online', label: 'Online', description: 'Create or join a room via WebSocket.' }
];

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="mode-selector">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={mode === option.value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          <span>{option.label}</span>
          <small>{option.description}</small>
        </button>
      ))}
    </div>
  );
}
