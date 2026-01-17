// server/server.ts
import { ClientMessage, ServerMessage } from "@shared/protocol";
import { RoomManager } from "./room-manager.js";
import { NetworkController } from "./controllers.js";
import type { ServerWebSocket } from "bun";

// WebSocket data type
type WSData = { socketId: string };

// Global state
const roomManager = new RoomManager();
const sockets = new Map<string, ServerWebSocket<WSData>>();

// Helper: broadcast a message to all players in a room (optionally excluding one)
function broadcastToRoom(
  roomCode: string,
  message: ServerMessage,
  excludeSocketId?: string
) {
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
function handleJoinRoom(
  ws: ServerWebSocket<WSData>,
  msg: { roomCode: string; playerName: string; playerId: string }
) {
  const socketId = ws.data.socketId;

  try {
    console.log(
      `[JoinRoom] Player ${msg.playerName} (${msg.playerId}) joining room ${msg.roomCode}`
    );
    const { playerId, players } = roomManager.joinRoom(
      msg.roomCode,
      socketId,
      msg.playerName,
      msg.playerId
    );

    // Send to joiner
    const joinedReply: ServerMessage = {
      type: "room_joined",
      roomCode: msg.roomCode,
      playerId,
      players,
    };
    ws.send(JSON.stringify(joinedReply));

    // If game is in progress, send current game state
    const room = roomManager.getRoom(msg.roomCode)!;
    if (room.started && room.game) {
      console.log(
        `[JoinRoom] Game already started, sending state to reconnecting player`
      );
      // Find this player's seat by matching controller playerId
      const seat = room.game.seats.find(
        (s) =>
          s.controller instanceof NetworkController &&
          s.controller.playerId === playerId
      );

      if (seat && seat.controller instanceof NetworkController) {
        console.log(
          `[JoinRoom] Player ${playerId} is in seat ${seat.seatIndex}`
        );
        seat.controller.sendGameState(room.game, seat);
        seat.controller.resendPendingRequests();
      }
    }

    // Broadcast to room (excluding joiner)
    const newPlayer = room.players.get(playerId)!;
    const broadcastMsg: ServerMessage = {
      type: "player_joined",
      player: {
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
    const { roomCode, playerName } = result;
    // Broadcast to remaining players
    const leftReply: ServerMessage = {
      type: "room_left",
      roomCode,
      playerName,
    };
    ws.send(JSON.stringify(leftReply));

    const leftMsg: ServerMessage = {
      type: "player_left",
      playerName,
    };
    broadcastToRoom(roomCode, leftMsg);
  }
}

async function handleStartGame(ws: ServerWebSocket<WSData>) {
  const socketId = ws.data.socketId;

  try {
    // Get the room code before starting the game
    const roomCode = roomManager.getRoomCodeBySocketId(socketId);
    if (!roomCode) {
      throw new Error("Not in a room");
    }

    // Create a callback to send messages to specific players
    const sendToPlayer = (playerId: string, message: string) => {
      const room = roomManager.getRoom(roomCode);
      if (!room) {
        console.log(`[SendToPlayer] Room ${roomCode} not found`);
        return;
      }

      const player = room.players.get(playerId);
      if (player && player.socketId) {
        const playerSocket = sockets.get(player.socketId);
        if (playerSocket) {
          playerSocket.send(message);
        } else {
          console.log(`[SendToPlayer] Socket for player ${playerId} not found`);
        }
      } else {
        console.log(
          `[SendToPlayer] Player ${playerId} not found or not connected`
        );
      }
    };

    await roomManager.startGame(socketId, sendToPlayer);
  } catch (error) {
    const errorMsg: ServerMessage = {
      type: "error",
      message: error instanceof Error ? error.message : "Failed to start game",
    };
    ws.send(JSON.stringify(errorMsg));
  }
}

Bun.serve<WSData>({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,

  fetch(req, server) {
    // WebSocket upgrade - data will be set in open handler
    if (server.upgrade(req, { data: { socketId: "" } })) return;

    // Serve static files from dist/
    const url = new URL(req.url);
    const filePath = url.pathname === "/" ? "/index.html" : url.pathname;

    try {
      const file = Bun.file(`./dist${filePath}`);
      return new Response(file);
    } catch {
      // If file not found, return index.html for client-side routing
      const index = Bun.file("./dist/index.html");
      return new Response(index);
    }
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
      } else if (msg.type === "join_room") {
        handleJoinRoom(ws, msg);
      } else if (msg.type === "leave_room") {
        handleLeaveRoom(ws);
      } else if (msg.type === "start_game") {
        handleStartGame(ws);
      } else if (msg.type === "decision_response") {
        try {
          roomManager.handleDecisionResponse(
            ws.data.socketId,
            msg.requestId,
            msg.response
          );
        } catch (error) {
          const errorMsg: ServerMessage = {
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to handle decision response",
          };
          ws.send(JSON.stringify(errorMsg));
        }
      }
    },

    close(ws) {
      const socketId = ws.data.socketId;
      const result = roomManager.handleDisconnect(socketId);
      sockets.delete(socketId);

      if (result) {
        const { roomCode, playerName } = result;
        // Broadcast to remaining players
        const leftMsg: ServerMessage = {
          type: "player_left",
          playerName,
        };
        broadcastToRoom(roomCode, leftMsg);
      }
    },
  },
});

console.log(`Server running on port ${process.env.PORT || 3000}`);
