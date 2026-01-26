import { useEffect, useRef } from "react";
import { LobbyScreen } from "./LobbyScreen";
import { GameScreen } from "./GameScreen";
import { GameLog } from "./GameLog";
import { useGameWebSocket } from "./useGameWebSocket";
import { useRoomCode } from "./useRoomCode";
import { usePlayerId } from "./usePlayerId";
import { usePlayerName } from "./usePlayerName";

export function App() {
  const { roomCode, setRoomCode, clearRoomCode } = useRoomCode();
  const { state, connected, sendMessage, respondToDecision } =
    useGameWebSocket();
  const playerId = usePlayerId();
  const { playerName, setPlayerName } = usePlayerName();

  // Track current room without triggering effect re-runs
  const currentRoomRef = useRef(state.roomCode);
  useEffect(() => {
    currentRoomRef.current = state.roomCode;
  }, [state.roomCode]);

  useEffect(() => {
    if (!connected) return;
    if (!roomCode) return;
    if (!playerName) return;

    // Leave existing room if we're joining a different one
    if (currentRoomRef.current && currentRoomRef.current !== roomCode) {
      sendMessage({ type: "leave_room" });
    }

    sendMessage({
      type: "join_room",
      playerName,
      roomCode,
      playerId,
    });
  }, [connected, roomCode, playerName, playerId, sendMessage]);

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
        }}
        onStartGame={() => sendMessage({ type: "start_game" })}
        onLeaveRoom={handleLeaveRoom}
      />
    </div>
  );
}
