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

    case "room_left":
      return {
        ...state,
        roomCode: null,
        playerId: null,
        players: [],
        gameState: null,
        pendingDecision: null,
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
        pendingDecision: null,
      };

    case "error":
      return {
        ...state,
        error: message.message,
      };

    case "decision_request":
      return {
        ...state,
        pendingDecision: {
          requestId: message.requestId,
          decision: message.decision,
        },
      };

    case "game_log":
      return {
        ...state,
        gameLog: [
          ...state.gameLog,
          {
            line: message.line,
            important: Boolean(message.important),
          },
        ],
      };

    default:
      return state;
  }
}
