import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createInitialBoard,
  simulateMove,
  type Board,
  type Move,
  type PieceType
} from '@boop/game-engine';
import './App.css';
import { GameBoard } from './components/GameBoard';
import { ReservePanel } from './components/ReservePanel';
import { ModeSelector } from './components/ModeSelector';
import { ControlBar } from './components/ControlBar';
import { OnlinePanel } from './components/OnlinePanel';
import { Rules } from './components/Rules';
import { computeBoopPreview } from './utils/boopPreview';
import { hasSupply, needsRemoval } from './utils/boardState';
import { chooseAiMove } from './ai/aiPlayer';
import { useOnlineGame } from './network/useOnlineGame';
import type { BoopPreview, Coordinate, GameMode } from './types/game';

type Tab = 'play' | 'rules';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('play');
  const [board, setBoard] = useState<Board>(() => createInitialBoard());
  const [mode, setMode] = useState<GameMode>('local');
  const [selectedPiece, setSelectedPiece] = useState<PieceType>('kitten');
  const [pendingRemoval, setPendingRemoval] = useState<Coordinate | null>(null);
  const [preview, setPreview] = useState<BoopPreview | null>(null);
  const [impactPreview, setImpactPreview] = useState<BoopPreview | null>(null);
  const [status, setStatus] = useState('Hot-seat mode: Player 1 begins.');
  const [aiThinking, setAiThinking] = useState(false);
  const lastBoardRef = useRef(board);

  useEffect(() => {
    lastBoardRef.current = board;
  }, [board]);

  const online = useOnlineGame({
    onBoardUpdate: (nextBoard, lastMove) => {
      setBoard(nextBoard);
      setPendingRemoval(null);
      setPreview(null);
      if (lastMove) {
        setImpactPreview(computeBoopPreview(lastBoardRef.current, lastMove));
      } else {
        setImpactPreview(null);
      }
      setStatus(buildStatusMessage(nextBoard));
    },
    onStatus: setStatus
  });

  const resetGame = useCallback(
    (targetMode: GameMode = mode) => {
      setBoard(createInitialBoard());
      setPendingRemoval(null);
      setPreview(null);
      setImpactPreview(null);
      setSelectedPiece('kitten');
      if (targetMode === 'online') {
        setStatus('Connect to the server, then create or join a room.');
      } else if (targetMode === 'local') {
        setStatus('Hot-seat mode: Player 1 begins.');
      } else {
        setStatus('Solo mode: Player 1 begins.');
      }
    },
    [mode]
  );

  const handleModeChange = useCallback(
    (nextMode: GameMode) => {
      setMode(nextMode);
      resetGame(nextMode);
      if (nextMode === 'online') {
        online.connect();
      } else {
        online.disconnect();
      }
    },
    [online, resetGame]
  );

  const canSelectCat = hasSupply(board, board.turn, 'cat');
  const requiresRemoval = needsRemoval(board, board.turn);

  const boardDisabled = useMemo(() => {
    if (board.winner) return true;
    if (mode === 'ai-easy' || mode === 'ai-hard') {
      return board.turn === 2;
    }
    if (mode === 'online') {
      return (
        !online.state.playersReady ||
        !online.state.playerId ||
        online.state.playerId !== board.turn ||
        online.state.connectionStatus !== 'connected'
      );
    }
    return false;
  }, [board.turn, board.winner, mode, online.state]);

  const clearPreview = useCallback(() => setPreview(null), []);

  const applyLocalMove = useCallback(
    (move: Move) => {
      try {
        const previous = board;
        const nextBoard = simulateMove(board, move);
        setBoard(nextBoard);
        setPendingRemoval(null);
        setPreview(null);
        setImpactPreview(computeBoopPreview(previous, move));
        setStatus(buildStatusMessage(nextBoard));
      } catch (error) {
        if (error instanceof Error) {
          setStatus(error.message);
        } else {
          setStatus('Illegal move.');
        }
      }
    },
    [board]
  );

  const handleCellHover = useCallback(
    (x: number, y: number) => {
      if (board.winner) return;
      if (board.grid[y][x]) {
        setPreview(null);
        return;
      }
      if (!hasSupply(board, board.turn, selectedPiece)) {
        setPreview(null);
        return;
      }
      if (requiresRemoval && !pendingRemoval) {
        setPreview(null);
        return;
      }
      setPreview(
        computeBoopPreview(board, {
          owner: board.turn,
          x,
          y,
          pieceType: selectedPiece,
          remove: pendingRemoval ?? undefined
        })
      );
    },
    [board, pendingRemoval, requiresRemoval, selectedPiece]
  );

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (board.winner) return;
      const cell = board.grid[y][x];
      if (requiresRemoval && !pendingRemoval) {
        if (cell && cell.owner === board.turn) {
          setPendingRemoval({ x, y });
          setStatus('Piece selected for removal. Choose where to place.');
        }
        return;
      }

      if (cell) {
        if (cell.owner === board.turn) {
          setPendingRemoval((current) =>
            current && current.x === x && current.y === y ? null : { x, y }
          );
        }
        return;
      }

      if (!hasSupply(board, board.turn, selectedPiece)) {
        setStatus('No pieces of that type are available.');
        return;
      }

      const move: Move = {
        owner: board.turn,
        x,
        y,
        pieceType: selectedPiece,
        remove: pendingRemoval ?? undefined
      };

      if (mode === 'online') {
        online.sendMove(move);
        return;
      }

      applyLocalMove(move);
    },
    [applyLocalMove, board, mode, online, pendingRemoval, requiresRemoval, selectedPiece]
  );

  useEffect(() => {
    if (mode !== 'ai-easy' && mode !== 'ai-hard') {
      setAiThinking(false);
      return;
    }
    if (board.turn !== 2 || board.winner) {
      setAiThinking(false);
      return;
    }
    setAiThinking(true);
    const snapshot = board;
    const level = mode === 'ai-hard' ? 'hard' : 'easy';
    const timer = window.setTimeout(() => {
      const decision = chooseAiMove(snapshot, level);
      if (!decision) {
        setStatus('AI has no legal moves.');
        setAiThinking(false);
        return;
      }
      setBoard(decision.outcome);
      setPendingRemoval(null);
      setPreview(null);
      setImpactPreview(computeBoopPreview(snapshot, decision.move));
      setStatus(buildStatusMessage(decision.outcome));
      setAiThinking(false);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [board, mode]);

  useEffect(() => {
    if (!impactPreview) return;
    const timer = window.setTimeout(() => setImpactPreview(null), 800);
    return () => window.clearTimeout(timer);
  }, [impactPreview]);

  // Play bonk sound when pieces are booped
  useEffect(() => {
    if (!impactPreview || impactPreview.effects.length === 0) return;
    const audio = new Audio('/bonk.mp3');
    audio.play().catch((error) => {
      // Ignore errors (e.g., user hasn't interacted with page yet)
      console.debug('Could not play bonk sound:', error);
    });
  }, [impactPreview]);

  useEffect(() => {
    if (hasSupply(board, board.turn, selectedPiece)) return;
    if (hasSupply(board, board.turn, 'kitten')) {
      setSelectedPiece('kitten');
      return;
    }
    if (hasSupply(board, board.turn, 'cat')) {
      setSelectedPiece('cat');
    }
  }, [board, selectedPiece]);

  const handleReset = useCallback(() => {
    if (mode === 'online') {
      online.disconnect();
      setMode('local');
      resetGame('local');
    } else {
      resetGame(mode);
    }
  }, [mode, online, resetGame]);

  return (
    <div className="app">
      <header>
        <h1>UBSWPC bonk!</h1>
        <div className="tabs">
          <button
            className={activeTab === 'play' ? 'active' : ''}
            onClick={() => setActiveTab('play')}
            type="button"
          >
            Play
          </button>
          <button
            className={activeTab === 'rules' ? 'active' : ''}
            onClick={() => setActiveTab('rules')}
            type="button"
          >
            Rules
          </button>
        </div>
      </header>
      {activeTab === 'play' ? (
        <>
          <div className="mode-selector-wrapper">
            <ModeSelector mode={mode} onChange={handleModeChange} />
          </div>
          <div className="layout">
            <div className="left-panel">
              <GameBoard
                board={board}
                selectedPiece={selectedPiece}
                preview={preview}
                impactPreview={impactPreview}
                pendingRemoval={pendingRemoval}
                requiresRemoval={requiresRemoval}
                disabled={boardDisabled}
                onCellClick={handleCellClick}
                onCellHover={handleCellHover}
                onCellLeave={clearPreview}
              />
              <ControlBar
                selectedPiece={selectedPiece}
                canSelectCat={canSelectCat}
                onSelectPiece={setSelectedPiece}
                onReset={handleReset}
                status={status}
                aiThinking={aiThinking}
              />
              {mode === 'online' && (
                <OnlinePanel
                  onlineState={online.state}
                  onCreate={(nickname) => online.createRoom(nickname)}
                  onJoin={(room, nickname) => online.joinRoom(room, nickname)}
                  onDisconnect={() => online.disconnect()}
                  onReconnect={() => online.reconnect()}
                  connect={() => online.connect()}
                />
              )}
            </div>
            <aside>
              <ReservePanel board={board} />
            </aside>
          </div>
        </>
      ) : (
        <Rules />
      )}
    </div>
  );
}

function buildStatusMessage(board: Board): string {
  if (board.winner) {
    return `Player ${board.winner} wins!`;
  }
  if (needsRemoval(board, board.turn)) {
    return `Player ${board.turn}: select a piece to remove before placing.`;
  }
  return `Player ${board.turn}: choose a space.`;
}
