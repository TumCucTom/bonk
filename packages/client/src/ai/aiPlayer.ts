import type { Board, Move, PieceType, PlayerId } from '@boop/game-engine';
import { simulateMove } from '@boop/game-engine';
import { needsRemoval } from '../utils/boardState';

export type AiLevel = 'easy' | 'hard';

export interface AiDecision {
  move: Move;
  outcome: Board;
}

export function chooseAiMove(board: Board, level: AiLevel): AiDecision | null {
  const owner: PlayerId = 2;
  const candidates = enumerateMoves(board, owner);
  if (!candidates.length) {
    return null;
  }

  if (level === 'easy') {
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    return choice;
  }

  let best: AiDecision | null = null;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const score = evaluateBoard(candidate.outcome, owner);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best ?? candidates[0];
}

function enumerateMoves(board: Board, owner: PlayerId): AiDecision[] {
  const moves: AiDecision[] = [];
  const removalNeeded = needsRemoval(board, owner);
  const removalTargets = removalNeeded ? getRemovalTargets(board, owner) : [null];
  const pieceTypes = getAvailablePieceTypes(board, owner, removalTargets);
  const opponent = owner === 1 ? 2 : 1;

  if (!pieceTypes.length) {
    return moves;
  }

  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      if (board.grid[y][x]) continue;
      for (const pieceType of pieceTypes) {
        for (const removal of removalTargets) {
          try {
            const move: Move = {
              owner,
              x,
              y,
              pieceType,
              remove: removal ?? undefined
            };
            const outcome = simulateMove(board, move);
            // Skip moves that immediately give the opponent a win (rare but checkable)
            if (outcome.winner === opponent) {
              continue;
            }
            moves.push({ move, outcome });
          } catch {
            /* ignore illegal move */
          }
        }
      }
    }
  }

  return moves;
}

function getRemovalTargets(board: Board, owner: PlayerId) {
  const targets: { x: number; y: number }[] = [];
  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      const cell = board.grid[y][x];
      if (cell && cell.owner === owner) {
        targets.push({ x, y });
      }
    }
  }
  return targets.length ? targets : [null];
}

function getAvailablePieceTypes(
  board: Board,
  owner: PlayerId,
  removalTargets: ({ x: number; y: number } | null)[]
): PieceType[] {
  const types: PieceType[] = [];
  if (board.supply[owner].kittens > 0) {
    types.push('kitten');
  }
  let catAvailable = board.supply[owner].cats > 0;
  if (!catAvailable) {
    catAvailable = removalTargets.some((target) => {
      if (!target) return false;
      const piece = board.grid[target.y]?.[target.x];
      return piece?.type === 'kitten';
    });
  }
  if (catAvailable) {
    types.push('cat');
  }
  return types;
}

function evaluateBoard(board: Board, owner: PlayerId): number {
  const opponent: PlayerId = owner === 1 ? 2 : 1;
  if (board.winner === owner) {
    return Number.POSITIVE_INFINITY;
  }
  if (board.winner === opponent) {
    return Number.NEGATIVE_INFINITY;
  }
  const catDelta = board.catsOnBoard[owner] - board.catsOnBoard[opponent];
  const pieceDelta = board.piecesOnBoard[owner] - board.piecesOnBoard[opponent];
  const catSupplyDelta = board.supply[owner].cats - board.supply[opponent].cats;
  const kittenSupplyDelta = board.supply[owner].kittens - board.supply[opponent].kittens;
  return catDelta * 12 + pieceDelta * 4 + catSupplyDelta * 3 + kittenSupplyDelta;
}
