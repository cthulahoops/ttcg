import { LobbyMenu } from "./LobbyMenu";
import { RoomLobby } from "./RoomLobby";
import type { GameOptions } from "@shared/protocol";

type Player = {
  name: string;
  connected: boolean;
};

type LobbyScreenProps = {
  roomCode: string | null;
  players: Player[];
  playerName: string | null;
  onJoinRoom: (playerName: string, roomCode: string) => void;
  onStartGame: (options: GameOptions) => void;
  onLeaveRoom: () => void;
};

export function LobbyScreen({
  roomCode,
  players,
  playerName,
  onJoinRoom,
  onStartGame,
  onLeaveRoom,
}: LobbyScreenProps) {
  if (!roomCode) {
    return <LobbyMenu playerName={playerName} onJoinRoom={onJoinRoom} />;
  }

  return (
    <RoomLobby
      roomCode={roomCode}
      players={players}
      onStartGame={onStartGame}
      onLeaveRoom={onLeaveRoom}
    />
  );
}
