import { useState } from 'react';
import type { OnlineState } from '../types/game';

interface OnlinePanelProps {
  onlineState: OnlineState;
  onCreate: (nickname: string) => void;
  onJoin: (roomCode: string, nickname: string) => void;
  onDisconnect: () => void;
  onReconnect: () => void;
  connect: () => void;
}

export function OnlinePanel({
  onlineState,
  onCreate,
  onJoin,
  onDisconnect,
  onReconnect,
  connect
}: OnlinePanelProps) {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');

  return (
    <div className="online-panel">
      <div className="online-actions">
        <label>
          <span>Nickname</span>
          <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="Paws" />
        </label>
        <label>
          <span>Room code</span>
          <input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="ABCD" />
        </label>
        <div className="online-buttons">
          <button type="button" onClick={() => onCreate(nickname)} disabled={!nickname}>
            Create room
          </button>
          <button type="button" onClick={() => onJoin(roomCode, nickname)} disabled={!nickname || roomCode.length < 4}>
            Join room
          </button>
        </div>
      </div>
      <div className="online-status">
        <p>
          Connection: <strong>{onlineState.connectionStatus}</strong>
        </p>
        {onlineState.roomCode && (
          <p>
            Room code: <strong>{onlineState.roomCode}</strong>
          </p>
        )}
        {onlineState.opponent && (
          <p>
            Opponent: <strong>{onlineState.opponent}</strong>
          </p>
        )}
        {onlineState.error && <p className="error">{onlineState.error}</p>}
        <div className="online-buttons">
          <button type="button" onClick={connect}>
            Connect
          </button>
          <button type="button" onClick={onReconnect} disabled={!onlineState.roomCode}>
            Reconnect
          </button>
          <button type="button" onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}
