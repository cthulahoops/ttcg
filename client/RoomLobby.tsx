type Player = {
  name: string;
  connected: boolean;
};

type RoomLobbyProps = {
  roomCode: string;
  players: Player[];
  onStartGame: () => void;
  onLeaveRoom: () => void;
};

export function RoomLobby({
  roomCode,
  players,
  onStartGame,
  onLeaveRoom,
}: RoomLobbyProps) {
  const canStartGame = players.length >= 2;

  return (
    <div className="room-lobby">
      <h2>
        Room: <span>{roomCode}</span>
      </h2>

      <div className="room-info">
        <p>Share this room code with other players</p>
      </div>

      <div className="players-list">
        <h3>Players ({players.length}/4)</h3>

        <ul>
          {players.map((player) => (
            <li
              key={player.name}
              className={!player.connected ? "disconnected" : undefined}
            >
              {player.name}
            </li>
          ))}
        </ul>
      </div>

      <div className="lobby-buttons">
        <button
          type="button"
          className="primary-btn"
          disabled={!canStartGame}
          onClick={onStartGame}
        >
          Start Game
        </button>

        <button type="button" className="secondary-btn" onClick={onLeaveRoom}>
          Leave Room
        </button>
      </div>
    </div>
  );
}
