import type { ClientState } from "./types";
import type { ServerMessage } from "@shared/protocol";

export function clientReducer(
  state: ClientState,
  message: ServerMessage,
): ClientState {
  switch (message.type) {
    case "pong":
      return {
        ...state,
        connected: true,
      };

    case "room_joined":
      return {
        ...state,
        roomCode: message.roomCode,
        playerId: message.playerId,
        players: message.players,
        error: null,
      };

    case "player_joined":
      return {
        ...state,
        players: [...state.players, message.player],
      };

    case "player_left":
      return {
        ...state,
        players: state.players.filter((p) => p.name !== message.playerName),
      };

    case "game_state":
      return {
        ...state,
        gameState: message.state,
      };

    case "error":
      return {
        ...state,
        error: message.message,
      };

    default:
      return state;
  }
}
