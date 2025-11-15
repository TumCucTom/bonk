import type { Board, PieceType } from '@boop/game-engine';
import type { BoopPreview, Coordinate } from '../types/game';
import { getImagePath } from '../utils/imagePaths';
import { getPieceImageSeed } from '../utils/pieceImageTracker';

interface GameBoardProps {
  board: Board;
  selectedPiece: PieceType;
  preview: BoopPreview | null;
  impactPreview: BoopPreview | null;
  pendingRemoval: Coordinate | null;
  requiresRemoval: boolean;
  disabled: boolean;
  onCellClick: (x: number, y: number) => void;
  onCellHover: (x: number, y: number) => void;
  onCellLeave: () => void;
}

export function GameBoard(props: GameBoardProps) {
  const {
    board,
    selectedPiece,
    preview,
    impactPreview,
    pendingRemoval,
    requiresRemoval,
    disabled,
    onCellClick,
    onCellHover,
    onCellLeave
  } = props;

  return (
    <div 
      className="board" 
      role="grid" 
      aria-label="Boop board"
      style={{ 
        gridTemplateColumns: `repeat(${board.size}, 1fr)`,
        gridTemplateRows: `repeat(${board.size}, 1fr)`
      }}
    >
      {board.grid.map((row: Board['grid'][number], y: number) =>
        row.map((cell, x) => {
          const key = `${x}-${y}`;
          const isPreviewPlacement = preview && preview.placement.x === x && preview.placement.y === y;
          const previewEffect = preview?.effects.find((effect) => effect.from.x === x && effect.from.y === y);
          const impactEffect = impactPreview?.effects.find((effect) => effect.from.x === x && effect.from.y === y);
          const isPendingRemoval = pendingRemoval && pendingRemoval.x === x && pendingRemoval.y === y;
          const occupant = cell;
          const canInteract = !disabled || occupant !== null;
          const showGhost = !occupant && isPreviewPlacement;

          return (
            <button
              key={key}
              className={buildCellClass({
                hasPiece: Boolean(occupant),
                previewOrigin: Boolean(previewEffect),
                impactOrigin: Boolean(impactEffect),
                previewDestination: Boolean(
                  preview?.effects.some((effect) => effect.to && effect.to.x === x && effect.to.y === y)
                ),
                impactDestination: Boolean(
                  impactPreview?.effects.some((effect) => effect.to && effect.to.x === x && effect.to.y === y)
                ),
                pendingRemoval: Boolean(isPendingRemoval),
                requiresRemoval: requiresRemoval && !pendingRemoval,
                offBoardPreview:
                  Boolean(previewEffect?.offBoard) && previewEffect?.from.x === x && previewEffect?.from.y === y
              })}
              disabled={!canInteract}
              onClick={() => onCellClick(x, y)}
              onMouseEnter={() => onCellHover(x, y)}
              onMouseLeave={onCellLeave}
            >
              {occupant && (
                <img 
                  src={getImagePath(occupant.type, occupant.owner, getPieceImageSeed(board, x, y, occupant.type, occupant.owner))} 
                  alt={`${occupant.type} belonging to player ${occupant.owner}`}
                  className={`piece ${occupant.type} player-${occupant.owner}`}
                />
              )}
              {showGhost && (
                <img 
                  src={getImagePath(selectedPiece, board.turn, Math.random() * 1000)} 
                  alt=""
                  className={`piece ghost ${selectedPiece} player-${board.turn}`}
                  aria-hidden="true"
                />
              )}
              {(previewEffect?.to || impactEffect?.to) && (
                <span className="boop-arrow" aria-hidden="true" />
              )}
            </button>
          );
        })
      )}
    </div>
  );
}

function buildCellClass(flags: Record<string, boolean>) {
  const classes = ['board-cell'];
  if (flags.hasPiece) {
    classes.push('cell-has-piece');
  }
  Object.entries(flags).forEach(([key, value]) => {
    if (!value) return;
    switch (key) {
      case 'hasPiece':
        break;
      case 'previewOrigin':
        classes.push('cell-preview-origin');
        break;
      case 'impactOrigin':
        classes.push('cell-impact-origin');
        break;
      case 'previewDestination':
        classes.push('cell-preview-destination');
        break;
      case 'impactDestination':
        classes.push('cell-impact-destination');
        break;
      case 'pendingRemoval':
        classes.push('cell-pending-removal');
        break;
      case 'requiresRemoval':
        classes.push('cell-removal-required');
        break;
      case 'offBoardPreview':
        classes.push('cell-preview-off-board');
        break;
      default:
        break;
    }
  });
  return classes.join(' ');
}
