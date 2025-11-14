import type { Move, PlayerId } from '@boop/game-engine';

export type GameMode = 'local' | 'ai-easy' | 'ai-hard' | 'online';

export interface Coordinate {
  x: number;
  y: number;
}

export interface BoopEffect {
  from: Coordinate;
  to?: Coordinate;
  offBoard?: boolean;
}

export interface BoopPreview {
  placement: Coordinate;
  effects: BoopEffect[];
}

export interface OnlineState {
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  roomCode: string | null;
  playerId: PlayerId | null;
  sessionId: string | null;
  nickname: string;
  opponent?: string | null;
  error?: string;
  playersReady: boolean;
}

export interface OnlineControls {
  createRoom: (nickname: string) => void;
  joinRoom: (roomCode: string, nickname: string) => void;
  disconnect: () => void;
  sendMove: (move: Move) => void;
  reconnect: () => void;
}
