import type { Board, PieceType, PlayerId } from '@boop/game-engine';

export function needsRemoval(board: Board, owner: PlayerId): boolean {
  return board.piecesOnBoard[owner] >= board.maxPiecesPerPlayer;
}

export function hasSupply(board: Board, owner: PlayerId, pieceType: PieceType): boolean {
  if (pieceType === 'kitten') {
    return board.supply[owner].kittens > 0;
  }
  return board.supply[owner].cats > 0;
}

export function getCellOwner(board: Board, x: number, y: number): PlayerId | null {
  const cell = board.grid[y]?.[x];
  return cell ? cell.owner : null;
}
