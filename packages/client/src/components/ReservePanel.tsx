import type { Board } from '@boop/game-engine';

interface ReservePanelProps {
  board: Board;
}

export function ReservePanel({ board }: ReservePanelProps) {
  const players = [1, 2] as const;
  return (
    <div className="reserve-panel">
      {players.map((player) => (
        <div key={player} className={`reserve-card ${board.turn === player ? 'active' : ''}`}>
          <h3>Player {player}</h3>
          <div className="reserve-row">
            <span>Freshers in supply</span>
            <strong>{board.supply[player].kittens}</strong>
          </div>
          <div className="reserve-row">
            <span>Seniors unlocked</span>
            <strong>
              {board.catsOnBoard[player]} / {board.maxPiecesPerPlayer}
            </strong>
          </div>
          <div className="reserve-row">
            <span>Seniors in supply</span>
            <strong>{board.supply[player].cats}</strong>
          </div>
          <div className="reserve-row">
            <span>Pieces on board</span>
            <strong>{board.piecesOnBoard[player]}</strong>
          </div>
        </div>
      ))}
    </div>
  );
}
