import type { PieceType } from '@boop/game-engine';

interface ControlBarProps {
  selectedPiece: PieceType;
  canSelectCat: boolean;
  onSelectPiece: (piece: PieceType) => void;
  onReset: () => void;
  status: string;
  aiThinking: boolean;
}

export function ControlBar({ selectedPiece, canSelectCat, onSelectPiece, onReset, status, aiThinking }: ControlBarProps) {
  return (
    <div className="control-bar">
      <div className="piece-toggle">
        <button
          type="button"
          className={selectedPiece === 'kitten' ? 'active' : ''}
          onClick={() => onSelectPiece('kitten')}
        >
          Kitten
        </button>
        <button
          type="button"
          className={selectedPiece === 'cat' ? 'active' : ''}
          onClick={() => onSelectPiece('cat')}
          disabled={!canSelectCat}
        >
          Cat
        </button>
      </div>
      <div className="status-text">
        {status}
        {aiThinking && <span className="status-pill">AI thinking…</span>}
      </div>
      <button type="button" onClick={onReset}>
        Reset game
      </button>
    </div>
  );
}
