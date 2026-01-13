import { useState } from "react";
import { LobbyScreen } from "./LobbyScreen";
import { GameScreen } from "./GameScreen";
import { useGameWebSocket } from "./useGameWebSocket";

export function App() {
  const { state, sendMessage } = useGameWebSocket();

  if (state.gameState) {
    return (
      <div className="container">
        <GameScreen game={state.gameState} />;
      </div>
    );
  }
  return (
    <div className="container">
      <LobbyScreen
        roomCode={state.roomCode}
        players={state.players}
        onJoinRoom={(playerName, roomCode) =>
          sendMessage({
            type: "join_room",
            playerName,
            roomCode,
            playerId: generateUUID(),
          })
        }
        onStartGame={() => sendMessage({ type: "start_game" })}
        onLeaveRoom={() => sendMessage({ type: "leave_room" })}
      />
    </div>
  );
}

function generateUUID(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback implementation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
