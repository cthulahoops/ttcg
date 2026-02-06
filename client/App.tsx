import { useCallback } from "react";
import { LobbyScreen } from "./LobbyScreen";
import { GameScreen } from "./GameScreen";
import { GameLog } from "./GameLog";
import { useGameWebSocket } from "./useGameWebSocket";
import { useRoomCode } from "./useRoomCode";
import { usePlayerId } from "./usePlayerId";
import { usePlayerName } from "./usePlayerName";
import type { ClientMessage } from "@shared/protocol";

export function App() {
  const { roomCode, setRoomCode, clearRoomCode } = useRoomCode();
  const playerId = usePlayerId();
  const { playerName, setPlayerName } = usePlayerName();

  const onConnect = useCallback(
    (send: (msg: ClientMessage) => void) => {
      if (roomCode && playerName) {
        send({ type: "join_room", roomCode, playerName, playerId });
      }
    },
    [roomCode, playerName, playerId]
  );

  const { state, sendMessage, respondToDecision } = useGameWebSocket({
    onConnect,
  });

  const handleLeaveRoom = () => {
    sendMessage({ type: "leave_room" });
    clearRoomCode();
  };

  if (state.gameState) {
    return (
      <div className="container">
        <GameScreen
          game={state.gameState}
          onRespond={respondToDecision}
          pendingDecision={state.pendingDecision}
        />
        <GameLog entries={state.gameLog} />
      </div>
    );
  }
  return (
    <div className="lobby-screen">
      <LobbyScreen
        roomCode={state.roomCode}
        players={state.players}
        playerName={playerName}
        onJoinRoom={(playerName, roomCode) => {
          setPlayerName(playerName);
          setRoomCode(roomCode);
          sendMessage({ type: "join_room", roomCode, playerName, playerId });
        }}
        onStartGame={() => sendMessage({ type: "start_game" })}
        onLeaveRoom={handleLeaveRoom}
      />
    </div>
  );
}
