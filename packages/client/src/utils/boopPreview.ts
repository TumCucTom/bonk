import type { Board, Move } from '@boop/game-engine';
import type { BoopEffect, BoopPreview, Coordinate } from '../types/game';

const OFFSETS = [-1, 0, 1];

export function computeBoopPreview(board: Board, move: Move): BoopPreview {
  const effects: BoopEffect[] = [];
  const boopsCats = move.pieceType === 'cat';

  for (const dy of OFFSETS) {
    for (const dx of OFFSETS) {
      if (dx === 0 && dy === 0) continue;
      const targetX = move.x + dx;
      const targetY = move.y + dy;
      const targetPiece = getProjectedCell(board, targetX, targetY, move.remove);
      if (!targetPiece) continue;
      if (!boopsCats && targetPiece.type !== 'kitten') continue;

      const destinationX = targetX + dx;
      const destinationY = targetY + dy;
      const offBoard = !isWithinBounds(board, destinationX, destinationY);
      const blocked = !offBoard && Boolean(getProjectedCell(board, destinationX, destinationY, move.remove));
      if (blocked) continue;

      effects.push({
        from: { x: targetX, y: targetY },
        to: offBoard ? undefined : { x: destinationX, y: destinationY },
        offBoard
      });
    }
  }

  return {
    placement: { x: move.x, y: move.y },
    effects
  };
}

function getProjectedCell(board: Board, x: number, y: number, removal?: Coordinate | null) {
  if (!isWithinBounds(board, x, y)) {
    return null;
  }
  if (removal && removal.x === x && removal.y === y) {
    return null;
  }
  return board.grid[y][x];
}

function isWithinBounds(board: Board, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < board.size && y < board.size;
}
