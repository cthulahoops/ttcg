import { useState } from "react";

type LobbyMenuProps = {
  playerName: string | null;
  onJoinRoom: (playerName: string, roomCode: string) => void;
};

export function LobbyMenu({ playerName: initialPlayerName, onJoinRoom }: LobbyMenuProps) {
  const [playerName, setPlayerName] = useState(initialPlayerName ?? "");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleJoin = () => {
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }

    if (roomCode.length !== 4) {
      setError("Room code must be 4 letters");
      return;
    }

    setError(null);
    onJoinRoom(playerName.trim(), roomCode.toUpperCase());
  };

  return (
    <div className="lobby-menu">
      <h2>Join a Game</h2>

      <div className="lobby-form">
        <input
          type="text"
          placeholder="Your Name"
          maxLength={20}
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />

        <div className="join-room-group">
          <input
            type="text"
            placeholder="Room Code (4 letters)"
            maxLength={4}
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          />

          <button
            type="button"
            className="secondary-btn"
            onClick={() => setRoomCode(randomRoomCode())}
          >
            Random Code
          </button>
        </div>

        <button type="button" className="primary-btn" onClick={handleJoin}>
          Join Room
        </button>
      </div>

      {error && <div className="lobby-error">{error}</div>}
    </div>
  );
}

function randomRoomCode(): string {
  // Generate a random 4-character room code (A-Z excluding I and O)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
