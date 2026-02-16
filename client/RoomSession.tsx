import { useCallback } from "react";
import { GameScreen } from "./GameScreen";
import { GameLog } from "./GameLog";
import { RoomLobby } from "./RoomLobby";
import { useGameWebSocket } from "./useGameWebSocket";
import type { ClientMessage, GameOptions } from "@shared/protocol";

type RoomSessionProps = {
  targetRoomCode: string;
  playerId: string;
  playerName: string;
  clearRoomCode: () => void;
};

export function RoomSession({
  targetRoomCode,
  playerId,
  playerName,
  clearRoomCode,
}: RoomSessionProps) {
  const onConnect = useCallback(
    (send: (msg: ClientMessage) => void) => {
      send({
        type: "join_room",
        roomCode: targetRoomCode,
        playerName,
        playerId,
      });
    },
    [targetRoomCode, playerName, playerId]
  );

  const { state, sendMessage, respondToDecision } = useGameWebSocket({
    onConnect,
  });

  function handleLeaveRoom() {
    sendMessage({ type: "leave_room" });
    clearRoomCode();
  }

  function handleStartGame(options: GameOptions) {
    sendMessage({ type: "start_game", options });
  }

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

  if (state.roomCode) {
    return (
      <div className="lobby-screen">
        <RoomLobby
          roomCode={state.roomCode}
          players={state.players}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
        />
        {state.error && <div className="lobby-error">{state.error}</div>}
      </div>
    );
  }

  return (
    <div className="lobby-screen">
      <div className="lobby-menu">
        <h2>Joining Room {targetRoomCode}</h2>
        <p>Connecting to the server...</p>
        {state.error && <div className="lobby-error">{state.error}</div>}
        <button type="button" className="secondary-btn" onClick={clearRoomCode}>
          Back
        </button>
      </div>
    </div>
  );
}
