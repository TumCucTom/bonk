import type { Board, Move } from '@boop/game-engine';
import { simulateMove, createInitialBoard, cloneBoard } from '@boop/game-engine';

// Cache for position-to-moveIndex mapping to avoid recomputing
let cachedBoardHistory: Move[] = [];
let cachedPositionMap: Map<string, number> = new Map();

/**
 * Gets the image seed for a piece at a given position.
 * Uses the move index that originally placed the piece by replaying the game.
 */
export function getPieceImageSeed(
  board: Board,
  x: number,
  y: number,
  _pieceType: 'kitten' | 'cat',
  _owner: 1 | 2
): number {
  // Check if we need to rebuild the cache
  if (cachedBoardHistory.length !== board.history.length || 
      !board.history.every((move, i) => 
        cachedBoardHistory[i]?.x === move.x && 
        cachedBoardHistory[i]?.y === move.y &&
        cachedBoardHistory[i]?.owner === move.owner &&
        cachedBoardHistory[i]?.pieceType === move.pieceType
      )) {
    // Rebuild cache by replaying the game
    cachedBoardHistory = board.history.map(m => ({ ...m }));
    cachedPositionMap = new Map();
    
    let testBoard = createInitialBoard({ size: board.size, maxPiecesPerPlayer: board.maxPiecesPerPlayer });
    const positionToMoveIndex = new Map<string, number>();
    
    // Track pieces by a unique ID (move index) and their current positions
    const piecePositions = new Map<number, { x: number; y: number }>();
    
    for (let moveIndex = 0; moveIndex < board.history.length; moveIndex++) {
      const move = board.history[moveIndex];
      const prevBoard = cloneBoard(testBoard);
      
      // Apply the move
      testBoard = simulateMove(testBoard, move);
      
      // The newly placed piece gets this move index
      piecePositions.set(moveIndex, { x: move.x, y: move.y });
      
      // Update positions for pieces that moved due to boops
      // Compare previous and current board states
      for (let py = 0; py < board.size; py++) {
        for (let px = 0; px < board.size; px++) {
          const prevPiece = prevBoard.grid[py][px];
          const currPiece = testBoard.grid[py][px];
          
          // If a piece moved from here, find where it went
          if (prevPiece && !currPiece) {
            // Piece left this position - find where it went
            for (let cy = 0; cy < board.size; cy++) {
              for (let cx = 0; cx < board.size; cx++) {
                if ((cx !== px || cy !== py) && 
                    testBoard.grid[cy][cx] &&
                    testBoard.grid[cy][cx]?.owner === prevPiece.owner &&
                    testBoard.grid[cy][cx]?.type === prevPiece.type) {
                  // Check if this piece wasn't here before
                  if (!prevBoard.grid[cy][cx] || 
                      prevBoard.grid[cy][cx]?.owner !== prevPiece.owner ||
                      prevBoard.grid[cy][cx]?.type !== prevPiece.type) {
                    // Found where the piece moved to - update tracking
                    for (const [_mid, pos] of piecePositions.entries()) {
                      if (pos.x === px && pos.y === py) {
                        pos.x = cx;
                        pos.y = cy;
                        break;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    
    // Build final position map
    for (const [moveIndex, pos] of piecePositions.entries()) {
      const key = `${pos.x},${pos.y}`;
      positionToMoveIndex.set(key, moveIndex);
    }
    
    cachedPositionMap = positionToMoveIndex;
  }
  
  // Look up the move index for this position
  const positionKey = `${x},${y}`;
  const moveIndex = cachedPositionMap.get(positionKey);
  
  if (moveIndex !== undefined) {
    // Use move index as seed - this ensures each placed piece gets a random but consistent image
    return moveIndex;
  }
  
  // Fallback: use position-based seed
  return x + y * board.size;
}

