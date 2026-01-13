import { useEffect, useReducer, useRef } from "react";
import { clientReducer } from "./reducer";
import { ClientState } from "./types";
import type { ClientMessage, ServerMessage } from "@shared/protocol";

export const initialClientState: ClientState = {
  connected: false,
  roomCode: null,
  playerId: null,
  players: [],
  gameState: null,
  error: null,
  pendingDecision: null,
  gameLog: [],
};

export function useGameWebSocket() {
  const [state, dispatch] = useReducer(clientReducer, initialClientState);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}:3000`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      dispatch(message);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
    };

    ws.onclose = () => {
      console.warn("WebSocket closed");
    };

    return () => {
      ws.close();
    };
  }, []);

  function sendMessage(message: ClientMessage) {
    const ws = wsRef.current;

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not open");
    }
  }

  return {
    state,
    sendMessage,
  };
}
