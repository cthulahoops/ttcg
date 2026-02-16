import { LobbyMenu } from "./LobbyMenu";
import { NameGate } from "./NameGate";
import { RoomSession } from "./RoomSession";
import { useRoomCode } from "./useRoomCode";
import { usePlayerId } from "./usePlayerId";
import { usePlayerName } from "./usePlayerName";

export function App() {
  const {
    roomCode: targetRoomCode,
    setRoomCode,
    clearRoomCode,
  } = useRoomCode();
  const playerId = usePlayerId();
  const { playerName, setPlayerName } = usePlayerName();

  if (!targetRoomCode) {
    return (
      <div className="lobby-screen">
        <LobbyMenu
          playerName={playerName}
          onJoinRoom={(nextPlayerName, nextRoomCode) => {
            setPlayerName(nextPlayerName);
            setRoomCode(nextRoomCode);
          }}
        />
      </div>
    );
  }

  if (!playerName) {
    return (
      <div className="lobby-screen">
        <NameGate
          roomCode={targetRoomCode}
          onSubmit={(nextPlayerName) => setPlayerName(nextPlayerName)}
          onBack={clearRoomCode}
        />
      </div>
    );
  }

  return (
    <RoomSession
      key={targetRoomCode}
      targetRoomCode={targetRoomCode}
      playerId={playerId}
      playerName={playerName}
      clearRoomCode={clearRoomCode}
    />
  );
}
