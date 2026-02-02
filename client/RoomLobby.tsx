import { useState } from "react";
import type { GameMode, GameOptions } from "@shared/protocol";

type Player = {
  name: string;
  connected: boolean;
};

type RoomLobbyProps = {
  roomCode: string;
  players: Player[];
  onStartGame: (options: GameOptions) => void;
  onLeaveRoom: () => void;
};

export function RoomLobby({
  roomCode,
  players,
  onStartGame,
  onLeaveRoom,
}: RoomLobbyProps) {
  const [gameMode, setGameMode] = useState<GameMode>("short");
  const canStartGame = players.length >= 1;

  const handleStartGame = () => {
    onStartGame({ mode: gameMode });
  };

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

      <div className="game-mode-selection">
        <h3>Game Mode</h3>
        <label className="radio-option">
          <input
            type="radio"
            name="gameMode"
            value="short"
            checked={gameMode === "short"}
            onChange={() => setGameMode("short")}
          />
          <span>Short Game</span>
          <span className="mode-description">Single round</span>
        </label>
        <label className="radio-option">
          <input
            type="radio"
            name="gameMode"
            value="long"
            checked={gameMode === "long"}
            onChange={() => setGameMode("long")}
          />
          <span>Long Game</span>
          <span className="mode-description">
            Campaign mode - complete all characters
          </span>
        </label>
      </div>

      <div className="lobby-buttons">
        <button
          type="button"
          className="primary-btn"
          disabled={!canStartGame}
          onClick={handleStartGame}
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
