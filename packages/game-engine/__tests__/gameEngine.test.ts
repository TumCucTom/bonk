import { applyMove, simulateMove, createInitialBoard, Board, Piece } from '../src';

const seedPiece = (board: Board, x: number, y: number, piece: Piece) => {
  board.grid[y][x] = piece;
  board.piecesOnBoard[piece.owner] += 1;
  if (piece.type === 'cat') {
    board.catsOnBoard[piece.owner] += 1;
  }
};

describe('gameEngine', () => {
  it('creates a board with expected defaults', () => {
    const board = createInitialBoard();
    expect(board.size).toBe(6);
    expect(board.grid).toHaveLength(6);
    expect(board.turn).toBe(1);
    expect(board.winner).toBeNull();
    expect(board.supply[1].kittens).toBe(8);
    expect(board.supply[2].kittens).toBe(8);
  });

  it('places a kitten and updates supply/turn', () => {
    const board = createInitialBoard();
    applyMove(board, { owner: 1, x: 0, y: 0, pieceType: 'kitten' });
    expect(board.grid[0][0]).toEqual({ owner: 1, type: 'kitten' });
    expect(board.supply[1].kittens).toBe(7);
    expect(board.turn).toBe(2);
  });

  it('simulateMove previews without mutating original board', () => {
    const board = createInitialBoard();
    const preview = simulateMove(board, { owner: 1, x: 1, y: 1, pieceType: 'kitten' });
    expect(board.grid[1][1]).toBeNull();
    expect(board.supply[1].kittens).toBe(8);
    expect(preview.grid[1][1]).toEqual({ owner: 1, type: 'kitten' });
  });

  it('kitten boops only adjacent kittens', () => {
    const board = createInitialBoard();
    board.supply[2].cats = 1;
    board.turn = 2;
    applyMove(board, { owner: 2, x: 2, y: 2, pieceType: 'cat' });
    board.turn = 2;
    applyMove(board, { owner: 2, x: 2, y: 1, pieceType: 'kitten' });

    board.turn = 1;
    applyMove(board, { owner: 1, x: 1, y: 1, pieceType: 'kitten' });

    expect(board.grid[1][3]).toEqual({ owner: 2, type: 'kitten' });
    expect(board.grid[1][2]).toBeNull();
    expect(board.grid[2][2]).toEqual({ owner: 2, type: 'cat' });
  });

  it('boops are blocked by contiguous pieces', () => {
    const board = createInitialBoard();
    seedPiece(board, 2, 2, { owner: 2, type: 'kitten' });
    seedPiece(board, 3, 2, { owner: 2, type: 'kitten' });
    board.supply[2].kittens = 6;
    board.supply[1].cats = 1;

    board.turn = 1;
    applyMove(board, { owner: 1, x: 1, y: 2, pieceType: 'cat' });

    expect(board.grid[2][2]).toEqual({ owner: 2, type: 'kitten' });
    expect(board.grid[2][3]).toEqual({ owner: 2, type: 'kitten' });
  });

  it('boops can push pieces off the board and return them to supply', () => {
    const board = createInitialBoard();
    board.supply[1].cats = 1;
    board.turn = 2;
    applyMove(board, { owner: 2, x: 0, y: 0, pieceType: 'kitten' });

    board.turn = 1;
    applyMove(board, { owner: 1, x: 1, y: 1, pieceType: 'cat' });

    expect(board.grid[0][0]).toBeNull();
    expect(board.supply[2].kittens).toBe(8);
  });

  it('graduates kittens and awards cats when making a line', () => {
    const board = createInitialBoard();
    board.supply[2].cats = 1;
    board.turn = 2;
    applyMove(board, { owner: 2, x: 1, y: 1, pieceType: 'cat' });

    board.turn = 1;
    applyMove(board, { owner: 1, x: 2, y: 1, pieceType: 'kitten' });
    board.turn = 1;
    applyMove(board, { owner: 1, x: 3, y: 1, pieceType: 'kitten' });
    board.turn = 1;
    applyMove(board, { owner: 1, x: 4, y: 1, pieceType: 'kitten' });

    expect(board.grid[1][2]).toBeNull();
    expect(board.grid[1][3]).toBeNull();
    expect(board.grid[1][4]).toBeNull();
    expect(board.supply[1].cats).toBe(3);
  });

  it('recognizes a win via three cats in a row', () => {
    const board = createInitialBoard();
    board.supply[1].cats = 3;

    board.turn = 1;
    applyMove(board, { owner: 1, x: 2, y: 2, pieceType: 'cat' });
    board.turn = 2;
    applyMove(board, { owner: 2, x: 1, y: 2, pieceType: 'kitten' }); // blocker
    board.turn = 1;
    applyMove(board, { owner: 1, x: 3, y: 2, pieceType: 'cat' });
    board.turn = 1;
    applyMove(board, { owner: 1, x: 4, y: 2, pieceType: 'cat' });

    expect(board.winner).toBe(1);
  });

  it('enforces removal when at the piece cap', () => {
    const board = createInitialBoard();
    const placements: Array<[number, number]> = [
      [0, 0],
      [2, 0],
      [4, 0],
      [1, 2],
      [3, 2],
      [5, 2],
      [0, 4],
      [2, 4]
    ];

    placements.forEach(([x, y]) => {
      board.turn = 1;
      applyMove(board, { owner: 1, x, y, pieceType: 'kitten' });
    });

    board.supply[1].cats = 1;
    board.turn = 1;
    expect(() =>
      applyMove(board, { owner: 1, x: 4, y: 4, pieceType: 'cat' })
    ).toThrow('Player must remove one of their pieces before placing.');

    board.turn = 1;
    applyMove(board, {
      owner: 1,
      x: 4,
      y: 4,
      pieceType: 'cat',
      remove: { x: 0, y: 0 }
    });

    expect(board.grid[4][4]).toEqual({ owner: 1, type: 'cat' });
  });

  it('recognizes a win when all eight cats are on the board', () => {
    const board = createInitialBoard();
    board.supply[1].cats = 8;
    const placements: Array<[number, number]> = [
      [0, 0],
      [2, 0],
      [4, 0],
      [1, 2],
      [3, 2],
      [5, 2],
      [0, 4],
      [2, 4]
    ];

    placements.forEach(([x, y]) => {
      board.turn = 1;
      applyMove(board, { owner: 1, x, y, pieceType: 'cat' });
    });

    expect(board.catsOnBoard[1]).toBe(8);
    expect(board.winner).toBe(1);
  });
});
