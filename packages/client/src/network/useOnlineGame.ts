import { useCallback, useEffect, useRef, useState } from 'react';
import type { Board, Move } from '@boop/game-engine';
import type { OnlineState } from '../types/game';
import type { ClientMessage, ServerMessage } from './types';

interface Options {
  onBoardUpdate: (board: Board, lastMove?: Move) => void;
  onStatus: (status: string) => void;
}

const STORAGE_KEY = 'boop-online-session';
const DEFAULT_STATE: OnlineState = {
  connectionStatus: 'idle',
  roomCode: null,
  playerId: null,
  sessionId: null,
  nickname: '',
  opponent: null,
  playersReady: false
};

interface StoredSession {
  roomCode: string;
  sessionId: string;
}

export function useOnlineGame({ onBoardUpdate, onStatus }: Options) {
  const [state, setState] = useState<OnlineState>(DEFAULT_STATE);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingMessageRef = useRef<ClientMessage | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const wsUrl = import.meta.env.VITE_WS_URL ?? 'ws://localhost:4000/ws';

  const persistSession = useCallback((data: StoredSession) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const readStoredSession = useCallback((): StoredSession | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  }, []);

  const clearStoredSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const handleMessage = useCallback(
    (message: ServerMessage) => {
      switch (message.type) {
        case 'roomCreated':
        case 'joinedRoom':
        case 'reconnected': {
          persistSession({ roomCode: message.roomCode, sessionId: message.sessionId });
          setState((prev) => ({
            ...prev,
            roomCode: message.roomCode,
            playerId: message.playerId,
            sessionId: message.sessionId,
            connectionStatus: 'connected',
            error: undefined,
            playersReady: message.type !== 'roomCreated' ? true : prev.playersReady
          }));
          onBoardUpdate(message.board);
          onStatus(
            message.type === 'roomCreated'
              ? `Room ${message.roomCode} created. Share the code with your friend.`
              : `Joined room ${message.roomCode}.`
          );
          break;
        }
        case 'stateUpdate': {
          setState((prev) => ({ ...prev, playersReady: true }));
          onBoardUpdate(message.board, message.lastMove);
          break;
        }
        case 'playerEvent': {
          if (message.status === 'joined') {
            setState((prev) => ({ ...prev, opponent: message.nickname ?? 'Opponent', playersReady: true }));
            onStatus('Your opponent has joined the room.');
          } else {
            setState((prev) => ({ ...prev, opponent: null, playersReady: false }));
            onStatus('Opponent disconnected. Waiting for them to reconnect...');
          }
          break;
        }
        case 'error': {
          setState((prev) => ({ ...prev, error: message.message }));
          onStatus(message.message);
          break;
        }
        default:
          break;
      }
    },
    [onBoardUpdate, onStatus, persistSession]
  );

  const connectSocket = useCallback(() => {
    const existing = socketRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    setState((prev) => ({ ...prev, connectionStatus: 'connecting', error: undefined }));

    socket.onopen = () => {
      setState((prev) => ({ ...prev, connectionStatus: 'connected' }));
      const stored = readStoredSession();
      if (stored && !pendingMessageRef.current) {
        socket.send(
          JSON.stringify({
            type: 'reconnect',
            roomCode: stored.roomCode,
            sessionId: stored.sessionId
          } satisfies ClientMessage)
        );
      }
      if (pendingMessageRef.current) {
        socket.send(JSON.stringify(pendingMessageRef.current));
        pendingMessageRef.current = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as ServerMessage;
        handleMessage(payload);
      } catch (error) {
        console.error('Failed to parse server payload', error);
      }
    };

    socket.onclose = () => {
      socketRef.current = null;
      setState((prev) => ({ ...prev, connectionStatus: 'idle' }));
    };

    socket.onerror = () => {
      setState((prev) => ({ ...prev, connectionStatus: 'error', error: 'WebSocket error' }));
    };
  }, [handleMessage, readStoredSession, wsUrl]);

  const sendMessage = useCallback(
    (payload: ClientMessage) => {
      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(payload));
        return;
      }
      pendingMessageRef.current = payload;
      connectSocket();
    },
    [connectSocket]
  );

  const createRoom = useCallback(
    (nickname: string) => {
      setState((prev) => ({ ...prev, nickname }));
      sendMessage({ type: 'createRoom', nickname });
    },
    [sendMessage]
  );

  const joinRoom = useCallback(
    (roomCode: string, nickname: string) => {
      setState((prev) => ({ ...prev, nickname }));
      sendMessage({ type: 'joinRoom', roomCode: roomCode.toUpperCase(), nickname });
    },
    [sendMessage]
  );

  const sendMove = useCallback(
    (move: Move) => {
      const snapshot = stateRef.current;
      if (!snapshot.roomCode || !snapshot.playerId) {
        onStatus('You are not connected to a room.');
        return;
      }
      sendMessage({
        type: 'makeMove',
        roomCode: snapshot.roomCode,
        move: { ...move, owner: snapshot.playerId }
      });
    },
    [onStatus, sendMessage]
  );

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    pendingMessageRef.current = null;
    clearStoredSession();
    setState(DEFAULT_STATE);
  }, [clearStoredSession]);

  const reconnect = useCallback(() => {
    const stored = readStoredSession();
    if (!stored) {
      onStatus('No previous session found to reconnect.');
      return;
    }
    sendMessage({ type: 'reconnect', ...stored });
  }, [onStatus, readStoredSession, sendMessage]);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  return {
    state,
    createRoom,
    joinRoom,
    sendMove,
    disconnect,
    reconnect,
    connect: connectSocket
  };
}
