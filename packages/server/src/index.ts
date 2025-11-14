import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { customAlphabet, nanoid } from 'nanoid';
import {
  createInitialBoard,
  simulateMove,
  cloneBoard,
  type Board,
  type Move,
  type PlayerId
} from '@boop/game-engine';

const ROOM_CODE = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 4);
const PORT = Number(process.env.PORT ?? 4000);

const app = express();
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface PlayerSlot {
  id: PlayerId;
  nickname: string;
  sessionId: string;
  connected: boolean;
  socket?: WebSocket;
}

interface Room {
  code: string;
  board: Board;
  players: Record<PlayerId, PlayerSlot | null>;
  lastMove: Move | null;
  lastActivity: number;
}

interface ClientMeta {
  roomCode: string | null;
  playerId: PlayerId | null;
  sessionId: string | null;
}

const rooms = new Map<string, Room>();
const clients = new WeakMap<WebSocket, ClientMeta>();

wss.on('connection', (socket) => {
  clients.set(socket, { roomCode: null, playerId: null, sessionId: null });
  socket.on('message', (raw) => {
    try {
      const payload = JSON.parse(raw.toString());
      handleMessage(socket, payload);
    } catch (error) {
      send(socket, { type: 'error', message: 'Malformed payload' });
      console.error('Malformed payload', error);
    }
  });

  socket.on('close', () => handleDisconnect(socket));
});

function handleMessage(socket: WebSocket, payload: any) {
  switch (payload.type) {
    case 'createRoom':
      return handleCreateRoom(socket, String(payload.nickname || 'Player'));
    case 'joinRoom':
      return handleJoinRoom(socket, String(payload.roomCode || ''), String(payload.nickname || 'Player'));
    case 'reconnect':
      return handleReconnect(socket, String(payload.roomCode || ''), String(payload.sessionId || ''));
    case 'makeMove':
      return handleMove(socket, payload.move as Move);
    default:
      return send(socket, { type: 'error', message: 'Unknown message type' });
  }
}

function handleCreateRoom(socket: WebSocket, nickname: string) {
  const code = ROOM_CODE();
  const board = createInitialBoard();
  const sessionId = nanoid();
  const player: PlayerSlot = { id: 1, nickname, sessionId, connected: true, socket };
  const room: Room = {
    code,
    board,
    players: { 1: player, 2: null },
    lastMove: null,
    lastActivity: Date.now()
  };
  rooms.set(code, room);
  clients.set(socket, { roomCode: code, playerId: 1, sessionId });
  send(socket, { type: 'roomCreated', roomCode: code, playerId: 1, sessionId, board: cloneBoard(board) });
}

function handleJoinRoom(socket: WebSocket, roomCode: string, nickname: string) {
  const room = rooms.get(roomCode);
  if (!room) {
    send(socket, { type: 'error', message: 'Room not found' });
    return;
  }
  const availableSlot = room.players[1] ? (room.players[2] ? null : 2) : 1;
  if (!availableSlot) {
    send(socket, { type: 'error', message: 'Room is full' });
    return;
  }
  const sessionId = nanoid();
  const slot: PlayerSlot = { id: availableSlot, nickname, sessionId, connected: true, socket };
  room.players[availableSlot] = slot;
  room.lastActivity = Date.now();
  clients.set(socket, { roomCode, playerId: availableSlot, sessionId });
  send(socket, {
    type: 'joinedRoom',
    roomCode,
    playerId: availableSlot,
    sessionId,
    board: cloneBoard(room.board)
  });
  broadcast(room, {
    type: 'playerEvent',
    playerId: availableSlot,
    nickname,
    status: 'joined'
  });
}

function handleReconnect(socket: WebSocket, roomCode: string, sessionId: string) {
  const room = rooms.get(roomCode);
  if (!room) {
    send(socket, { type: 'error', message: 'Room not found' });
    return;
  }
  const slot = Object.values(room.players).find((player) => player && player.sessionId === sessionId);
  if (!slot) {
    send(socket, { type: 'error', message: 'Session not recognized' });
    return;
  }
  slot.connected = true;
  slot.socket = socket;
  room.lastActivity = Date.now();
  clients.set(socket, { roomCode, playerId: slot.id, sessionId });
  send(socket, {
    type: 'reconnected',
    roomCode,
    playerId: slot.id,
    sessionId,
    board: cloneBoard(room.board)
  });
}

function handleMove(socket: WebSocket, movePayload: Move) {
  const meta = clients.get(socket);
  if (!meta || !meta.roomCode || !meta.playerId) {
    send(socket, { type: 'error', message: 'You are not in a room.' });
    return;
  }
  const room = rooms.get(meta.roomCode);
  if (!room) {
    send(socket, { type: 'error', message: 'Room missing' });
    return;
  }
  if (room.board.winner) {
    send(socket, { type: 'error', message: 'Game already complete.' });
    return;
  }
  if (room.board.turn !== meta.playerId) {
    send(socket, { type: 'error', message: 'Not your turn.' });
    return;
  }
  const move: Move = {
    owner: meta.playerId,
    x: Number(movePayload.x),
    y: Number(movePayload.y),
    pieceType: movePayload.pieceType,
    remove: movePayload.remove ?? undefined
  };
  try {
    room.board = simulateMove(room.board, move);
    room.lastMove = move;
    room.lastActivity = Date.now();
    broadcast(room, { type: 'stateUpdate', board: cloneBoard(room.board), lastMove: move });
  } catch (error) {
    if (error instanceof Error) {
      send(socket, { type: 'error', message: error.message });
    } else {
      send(socket, { type: 'error', message: 'Unable to apply move.' });
    }
  }
}

function broadcast(room: Room, payload: object) {
  (Object.values(room.players) as PlayerSlot[]) 
    .filter(Boolean)
    .forEach((slot) => {
      if (slot?.connected && slot.socket?.readyState === WebSocket.OPEN) {
        slot.socket.send(JSON.stringify(payload));
      }
    });
}

function send(socket: WebSocket, payload: object) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function handleDisconnect(socket: WebSocket) {
  const meta = clients.get(socket);
  if (!meta || !meta.roomCode || !meta.playerId) {
    clients.delete(socket);
    return;
  }
  const room = rooms.get(meta.roomCode);
  if (!room) {
    clients.delete(socket);
    return;
  }
  const slot = room.players[meta.playerId];
  if (slot && slot.sessionId === meta.sessionId) {
    slot.connected = false;
    slot.socket = undefined;
    broadcast(room, { type: 'playerEvent', playerId: meta.playerId, status: 'left' });
  }
  clients.delete(socket);
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    const hasActivePlayer = Object.values(room.players).some((slot) => slot && slot.connected);
    if (!hasActivePlayer && now - room.lastActivity > 10 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}, 60_000);

server.listen(PORT, () => {
  console.log(`Boop server listening on port ${PORT}`);
});
