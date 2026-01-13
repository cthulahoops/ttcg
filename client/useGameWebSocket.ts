import { useEffect, useReducer, useRef, useState } from "react";
import { clientReducer } from "./reducer";
import { ClientState } from "./types";
import type { ClientMessage, ServerMessage } from "@shared/protocol";

import { usePlayerId } from "./usePlayerId";

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
  const [connected, setConnected] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host.replace(":5173", ":3000")}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const message: ServerMessage = JSON.parse(event.data);
      console.log("Received: ", message);
      dispatch(message);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
    };

    ws.onclose = () => {
      console.warn("WebSocket closed");
      setConnected(false);
    };

    return () => {
      ws.close();
      setConnected(false);
    };
  }, []);

  function sendMessage(message: ClientMessage) {
    const ws = wsRef.current;
    console.log("Send ", message);

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not open");
    }
  }

  return {
    state,
    connected,
    sendMessage,
  };
}
