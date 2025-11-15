import type { Board, Move, PlayerId } from '@boop/game-engine';

export type ClientMessage =
  | { type: 'createRoom'; nickname: string }
  | { type: 'joinRoom'; roomCode: string; nickname: string }
  | { type: 'reconnect'; roomCode: string; sessionId: string }
  | { type: 'makeMove'; roomCode: string; move: Move };

export type ServerMessage =
  | { type: 'roomCreated'; roomCode: string; playerId: PlayerId; sessionId: string; board: Board }
  | { type: 'joinedRoom'; roomCode: string; playerId: PlayerId; sessionId: string; board: Board }
  | { type: 'reconnected'; roomCode: string; playerId: PlayerId; sessionId: string; board: Board }
  | { type: 'stateUpdate'; board: Board; lastMove?: Move }
  | { type: 'playerEvent'; playerId: PlayerId; nickname?: string; status: 'joined' | 'left' }
  | { type: 'error'; message: string };
