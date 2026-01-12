// server/server.ts
import { ClientMessage, ServerMessage } from "@shared/protocol";
import { RoomManager } from "./room-manager.js";
import type { ServerWebSocket } from "bun";

// WebSocket data type
type WSData = { socketId: string };

// Global state
const roomManager = new RoomManager();
const sockets = new Map<string, ServerWebSocket<WSData>>();

// Helper: broadcast a message to all players in a room (optionally excluding one)
function broadcastToRoom(roomCode: string, message: ServerMessage, excludeSocketId?: string) {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;

  for (const player of room.players.values()) {
    if (player.socketId && player.socketId !== excludeSocketId) {
      const ws = sockets.get(player.socketId);
      if (ws) {
        ws.send(JSON.stringify(message));
      }
    }
  }
}

// Message handlers
function handleCreateRoom(ws: ServerWebSocket<WSData>, msg: { playerName: string }) {
  const socketId = ws.data.socketId;
  const roomCode = roomManager.createRoom(socketId, msg.playerName);

  // Get the created player info
  const room = roomManager.getRoom(roomCode)!;
  const player = Array.from(room.players.values())[0];

  const reply: ServerMessage = {
    type: "room_created",
    roomCode,
    playerId: player.playerId,
  };
  ws.send(JSON.stringify(reply));
}

function handleJoinRoom(ws: ServerWebSocket<WSData>, msg: { roomCode: string; playerName: string }) {
  const socketId = ws.data.socketId;

  try {
    const { playerId, players } = roomManager.joinRoom(msg.roomCode, socketId, msg.playerName);

    // Send to joiner
    const joinedReply: ServerMessage = {
      type: "room_joined",
      roomCode: msg.roomCode,
      playerId,
      players,
    };
    ws.send(JSON.stringify(joinedReply));

    // Broadcast to room (excluding joiner)
    const room = roomManager.getRoom(msg.roomCode)!;
    const newPlayer = room.players.get(playerId)!;
    const broadcastMsg: ServerMessage = {
      type: "player_joined",
      player: {
        playerId: newPlayer.playerId,
        name: newPlayer.name,
        connected: true,
      },
    };
    broadcastToRoom(msg.roomCode, broadcastMsg, socketId);

  } catch (error) {
    const errorMsg: ServerMessage = {
      type: "error",
      message: error instanceof Error ? error.message : "Failed to join room",
    };
    ws.send(JSON.stringify(errorMsg));
  }
}

function handleLeaveRoom(ws: ServerWebSocket<WSData>) {
  const socketId = ws.data.socketId;
  const result = roomManager.leaveRoom(socketId);

  if (result) {
    const { roomCode, playerId } = result;
    // Broadcast to remaining players
    const leftMsg: ServerMessage = {
      type: "player_left",
      playerId,
    };
    broadcastToRoom(roomCode, leftMsg);
  }
}

Bun.serve<WSData>({
  port: 3000,

  fetch(req, server) {
    // WebSocket upgrade - data will be set in open handler
    if (server.upgrade(req, { data: { socketId: "" } })) return;
    return new Response("OK");
  },

  websocket: {
    open(ws) {
      const socketId = crypto.randomUUID();
      ws.data = { socketId };
      sockets.set(socketId, ws);
    },

    message(ws, message) {
      const msg = JSON.parse(message.toString()) as ClientMessage;

      if (msg.type === "ping") {
        const reply: ServerMessage = { type: "pong" };
        ws.send(JSON.stringify(reply));
      } else if (msg.type === "create_room") {
        handleCreateRoom(ws, msg);
      } else if (msg.type === "join_room") {
        handleJoinRoom(ws, msg);
      } else if (msg.type === "leave_room") {
        handleLeaveRoom(ws);
      }
    },

    close(ws) {
      const socketId = ws.data.socketId;
      const result = roomManager.handleDisconnect(socketId);
      sockets.delete(socketId);

      if (result) {
        const { roomCode, playerId } = result;
        // Broadcast to remaining players
        const leftMsg: ServerMessage = {
          type: "player_left",
          playerId,
        };
        broadcastToRoom(roomCode, leftMsg);
      }
    },
  },
});
