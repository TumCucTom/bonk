export type PlayerId = 1 | 2;
export type PieceType = 'kitten' | 'cat';

export interface Piece {
  owner: PlayerId;
  type: PieceType;
}

export type Cell = Piece | null;

export interface PlayerSupply {
  kittens: number;
  cats: number;
}

export interface Move {
  owner: PlayerId;
  x: number;
  y: number;
  pieceType: PieceType;
  /**
   * Optional coordinates for the piece a player wishes to remove when they already
   * have the maximum number of pieces on the board. When omitted and removal is
   * required, the move will be rejected.
   */
  remove?: { x: number; y: number } | null;
}

export interface BoardConfig {
  size?: number;
  maxPiecesPerPlayer?: number;
}

export interface Board {
  size: number;
  grid: Cell[][];
  turn: PlayerId;
  winner: PlayerId | null;
  supply: Record<PlayerId, PlayerSupply>;
  piecesOnBoard: Record<PlayerId, number>;
  catsOnBoard: Record<PlayerId, number>;
  maxPiecesPerPlayer: number;
  history: Move[];
}

const DEFAULT_BOARD_SIZE = 6;
const DEFAULT_MAX_PIECES = 8;
const DIRECTIONS = [-1, 0, 1] as const;

export function createInitialBoard(config: BoardConfig = {}): Board {
  const size = config.size ?? DEFAULT_BOARD_SIZE;
  const maxPiecesPerPlayer = config.maxPiecesPerPlayer ?? DEFAULT_MAX_PIECES;
  const grid: Cell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  );

  return {
    size,
    grid,
    turn: 1,
    winner: null,
    supply: {
      1: { kittens: 8, cats: 0 },
      2: { kittens: 8, cats: 0 }
    },
    piecesOnBoard: {
      1: 0,
      2: 0
    },
    catsOnBoard: {
      1: 0,
      2: 0
    },
    maxPiecesPerPlayer,
    history: []
  };
}

export function cloneBoard(board: Board): Board {
  return {
    size: board.size,
    grid: board.grid.map((row) => row.map((cell) => (cell ? { ...cell } : null))),
    turn: board.turn,
    winner: board.winner,
    supply: {
      1: { ...board.supply[1] },
      2: { ...board.supply[2] }
    },
    piecesOnBoard: {
      1: board.piecesOnBoard[1],
      2: board.piecesOnBoard[2]
    },
    catsOnBoard: {
      1: board.catsOnBoard[1],
      2: board.catsOnBoard[2]
    },
    maxPiecesPerPlayer: board.maxPiecesPerPlayer,
    history: board.history.map((move) => ({
      ...move,
      remove: move.remove ? { ...move.remove } : move.remove ?? undefined
    }))
  };
}

export function simulateMove(board: Board, move: Move): Board {
  const preview = cloneBoard(board);
  return applyMove(preview, move);
}

type RemovalMode = 'return' | 'graduate';

export function applyMove(board: Board, move: Move): Board {
  if (board.winner) {
    throw new Error('Game is already complete.');
  }

  assertPlacementBasics(board, move);
  const { owner, x, y, pieceType } = move;

  const needsRemoval = board.piecesOnBoard[owner] >= board.maxPiecesPerPlayer;
  if (needsRemoval && !move.remove) {
    throw new Error('Player must remove one of their pieces before placing.');
  }

  if (move.remove) {
    removePiece(board, owner, move.remove, 'graduate');
  }

  ensureSupplyAvailable(board, owner, pieceType);

  pullFromSupply(board, owner, pieceType);

  const placedPiece: Piece = { owner, type: pieceType };
  board.grid[y][x] = placedPiece;
  board.piecesOnBoard[owner] += 1;
  if (pieceType === 'cat') {
    board.catsOnBoard[owner] += 1;
  }

  resolveBoops(board, move);

  const hasCatRow = hasCatLine(board, owner);
  const hasAllCatsPlaced = board.catsOnBoard[owner] === board.maxPiecesPerPlayer;
  if (hasCatRow || hasAllCatsPlaced) {
    board.winner = owner;
  } else {
    clearCompletedLines(board, owner);
  }

  board.history.push({
    ...move,
    remove: move.remove ? { ...move.remove } : move.remove ?? undefined
  });

  if (!board.winner) {
    board.turn = owner === 1 ? 2 : 1;
  }

  return board;
}

function assertPlacementBasics(board: Board, move: Move): void {
  const { owner, x, y } = move;
  if (owner !== board.turn) {
    throw new Error("It is not this player's turn.");
  }

  if (!isWithinBounds(board, x, y)) {
    throw new Error('Move is out of bounds.');
  }

  if (board.grid[y][x]) {
    throw new Error('Cell is not empty.');
  }

  if (move.remove) {
    assertRemovalTarget(board, owner, move.remove);
  }
}

function assertRemovalTarget(
  board: Board,
  owner: PlayerId,
  coords: { x: number; y: number }
): void {
  if (!isWithinBounds(board, coords.x, coords.y)) {
    throw new Error('Removal coordinate out of bounds.');
  }
  const cell = board.grid[coords.y][coords.x];
  if (!cell || cell.owner !== owner) {
    throw new Error('Selected removal cell does not contain your piece.');
  }
}

function ensureSupplyAvailable(board: Board, owner: PlayerId, type: PieceType): void {
  if (type === 'kitten') {
    if (board.supply[owner].kittens <= 0) {
      throw new Error('No kittens available to place.');
    }
  } else if (board.supply[owner].cats <= 0) {
    throw new Error('No cats available to place.');
  }
}

function isWithinBounds(board: Board, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < board.size && y < board.size;
}

function pullFromSupply(board: Board, owner: PlayerId, type: PieceType): void {
  if (type === 'kitten') {
    board.supply[owner].kittens -= 1;
  } else {
    board.supply[owner].cats -= 1;
  }
}

function removePiece(
  board: Board,
  owner: PlayerId,
  coords: { x: number; y: number },
  mode: RemovalMode
): void {
  const { x, y } = coords;
  if (!isWithinBounds(board, x, y)) {
    throw new Error('Removal coordinates out of bounds.');
  }
  const cell = board.grid[y][x];
  if (!cell || cell.owner !== owner) {
    throw new Error('Cannot remove this piece.');
  }

  board.grid[y][x] = null;
  board.piecesOnBoard[owner] -= 1;
  if (cell.type === 'cat') {
    board.catsOnBoard[owner] -= 1;
  }
  pushToSupply(board, owner, cell, mode);
}

function pushToSupply(
  board: Board,
  owner: PlayerId,
  piece: Piece,
  mode: RemovalMode
): void {
  if (piece.type === 'cat') {
    board.supply[owner].cats = Math.min(
      DEFAULT_MAX_PIECES,
      board.supply[owner].cats + 1
    );
    return;
  }

  if (mode === 'return') {
    board.supply[owner].kittens = Math.min(
      DEFAULT_MAX_PIECES,
      board.supply[owner].kittens + 1
    );
  } else {
    board.supply[owner].cats = Math.min(
      DEFAULT_MAX_PIECES,
      board.supply[owner].cats + 1
    );
  }
}

function resolveBoops(board: Board, move: Move): void {
  const { x: originX, y: originY, pieceType } = move;
  const boopCats = pieceType === 'cat';
  const queued: Array<{
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    piece: Piece;
    offBoard: boolean;
  }> = [];

  for (const dy of DIRECTIONS) {
    for (const dx of DIRECTIONS) {
      if (dx === 0 && dy === 0) continue;
      const targetX = originX + dx;
      const targetY = originY + dy;
      if (!isWithinBounds(board, targetX, targetY)) continue;
      const targetPiece = board.grid[targetY][targetX];
      if (!targetPiece) continue;
      if (!boopCats && targetPiece.type !== 'kitten') continue;

      const destX = targetX + dx;
      const destY = targetY + dy;
      const offBoard = !isWithinBounds(board, destX, destY);
      if (!offBoard && board.grid[destY][destX]) {
        continue; // blocked
      }

      queued.push({
        fromX: targetX,
        fromY: targetY,
        toX: destX,
        toY: destY,
        piece: { ...targetPiece },
        offBoard
      });
    }
  }

  for (const boop of queued) {
    const { fromX, fromY, toX, toY, piece, offBoard } = boop;
    const currentCell = board.grid[fromY][fromX];
    if (!currentCell || !piecesEqual(currentCell, piece)) {
      continue;
    }
    if (!offBoard && board.grid[toY]?.[toX]) {
      continue;
    }
    board.grid[fromY][fromX] = null;
    if (offBoard) {
      board.piecesOnBoard[piece.owner] -= 1;
      if (piece.type === 'cat') {
        board.catsOnBoard[piece.owner] -= 1;
      }
      pushToSupply(board, piece.owner, piece, 'return');
      continue;
    }
    board.grid[toY][toX] = piece;
  }
}

function piecesEqual(a: Cell, b: Cell): boolean {
  if (!a || !b) return false;
  return a.owner === b.owner && a.type === b.type;
}

function clearCompletedLines(board: Board, owner: PlayerId): number {
  const cellsToClear = new Set<string>();
  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 }
  ];
  for (const { dx, dy } of directions) {
    for (let y = 0; y < board.size; y++) {
      for (let x = 0; x < board.size; x++) {
        const line: Array<{ x: number; y: number; piece: Piece | null }> = [];
        for (let i = 0; i < 3; i++) {
          const cx = x + dx * i;
          const cy = y + dy * i;
          if (!isWithinBounds(board, cx, cy)) {
            line.length = 0;
            break;
          }
          line.push({ x: cx, y: cy, piece: board.grid[cy][cx] });
        }
        if (line.length !== 3) continue;
        if (line.every(({ piece }) => piece && piece.owner === owner)) {
          line.forEach(({ x: lx, y: ly }) => cellsToClear.add(`${lx},${ly}`));
        }
      }
    }
  }

  if (!cellsToClear.size) return 0;

  for (const key of cellsToClear) {
    const [xStr, yStr] = key.split(',');
    const x = Number(xStr);
    const y = Number(yStr);
    const piece = board.grid[y][x];
    if (!piece) continue;
    board.grid[y][x] = null;
    board.piecesOnBoard[piece.owner] -= 1;
    if (piece.type === 'cat') {
      board.catsOnBoard[piece.owner] -= 1;
    }
    pushToSupply(board, piece.owner, piece, 'graduate');
  }

  return cellsToClear.size;
}

function hasCatLine(board: Board, owner: PlayerId): boolean {
  const directions = [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 }
  ];

  for (const { dx, dy } of directions) {
    for (let y = 0; y < board.size; y++) {
      for (let x = 0; x < board.size; x++) {
        let matches = true;
        for (let i = 0; i < 3; i++) {
          const cx = x + dx * i;
          const cy = y + dy * i;
          if (!isWithinBounds(board, cx, cy)) {
            matches = false;
            break;
          }
          const piece = board.grid[cy][cx];
          if (!piece || piece.owner !== owner || piece.type !== 'cat') {
            matches = false;
            break;
          }
        }
        if (matches) {
          return true;
        }
      }
    }
  }
  return false;
}
