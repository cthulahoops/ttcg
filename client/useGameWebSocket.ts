import { useCallback, useEffect, useReducer, useRef } from "react";
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

type WebSocketOptions = {
  onConnect?: (send: (msg: ClientMessage) => void) => void;
};

export function useGameWebSocket(options: WebSocketOptions = {}) {
  const { onConnect } = options;
  const [state, dispatch] = useReducer(clientReducer, initialClientState);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const reconnectAttemptRef = useRef(0);

  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host.replace(":5173", ":3000")}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (wsRef.current !== ws) return; // Stale guard
        console.log("WebSocket connected");
        reconnectAttemptRef.current = 0;
        onConnect?.((msg) => ws.send(JSON.stringify(msg)));
      };

      ws.onmessage = (event) => {
        if (wsRef.current !== ws) return; // Stale guard
        const message: ServerMessage = JSON.parse(event.data);
        console.log("Received: ", message);
        dispatch(message);
      };

      ws.onerror = (err) => {
        console.error("WebSocket error", err);
      };

      ws.onclose = () => {
        if (wsRef.current !== ws) return; // Stale guard
        console.warn("WebSocket closed");

        // Reconnect with exponential backoff (max 10 seconds)
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttemptRef.current),
          10000
        );
        reconnectAttemptRef.current++;
        console.log(
          `Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`
        );
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [onConnect]);

  const sendMessage = useCallback((message: ClientMessage) => {
    const ws = wsRef.current;
    console.log("Send ", message);

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not open");
    }
  }, []);

  function respondToDecision(requestId: string, response: unknown) {
    dispatch({ type: "decision_cleared" });
    sendMessage({ type: "decision_response", requestId, response });
  }

  return {
    state,
    sendMessage,
    respondToDecision,
  };
}
