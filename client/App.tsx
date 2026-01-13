import { useState } from "react";
import { LobbyScreen } from "./LobbyScreen";
import { GameScreen } from "./GameScreen";
import { GameLog } from "./GameLog";
import { useGameWebSocket } from "./useGameWebSocket";
import { usePlayerId } from "./usePlayerId";

export function App() {
  const playerId = usePlayerId();
  const { state, sendMessage } = useGameWebSocket();

  if (state.gameState) {
    return (
      <div className="container">
        <GameScreen
          game={state.gameState}
          onRespond={(requestId, response) =>
            sendMessage({
              type: "decision_response",
              requestId,
              response,
            })
          }
          pendingDecision={state.pendingDecision}
        />
        <GameLog entries={state.gameLog} />
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
            playerId,
          })
        }
        onStartGame={() => sendMessage({ type: "start_game" })}
        onLeaveRoom={() => sendMessage({ type: "leave_room" })}
      />
    </div>
  );
}
