import { Game } from "../shared/game.js";
import type { Player } from "../shared/protocol.js";

interface InternalPlayer {
  playerId: string;        // UUID (separate from socket ID)
  socketId: string | null; // Current socket (null if disconnected)
  name: string;
  connected: boolean;
}

interface Room {
  code: string;              // 4-char uppercase (A-Z minus I/O)
  hostId: string;            // Player ID of host
  players: Map<string, InternalPlayer>;
  game: Game | null;         // null for MVP, reserved for future
  started: boolean;          // false for MVP, reserved for future
  createdAt: number;         // Timestamp for cleanup
}

export class RoomManager {
  private rooms: Map<string, Room>;           // roomCode → Room
  private socketToPlayer: Map<string, {      // socketId → player lookup
    roomCode: string;
    playerId: string;
  }>;

  constructor() {
    this.rooms = new Map();
    this.socketToPlayer = new Map();
  }

  /**
   * Create a new room with the given player as host
   * @returns The room code
   */
  createRoom(socketId: string, playerName: string): string {
    const roomCode = this.generateRoomCode();
    const playerId = this.generatePlayerId();

    const player: InternalPlayer = {
      playerId,
      socketId,
      name: playerName,
      connected: true,
    };

    const room: Room = {
      code: roomCode,
      hostId: playerId,
      players: new Map([[playerId, player]]),
      game: null,
      started: false,
      createdAt: Date.now(),
    };

    this.rooms.set(roomCode, room);
    this.socketToPlayer.set(socketId, { roomCode, playerId });

    return roomCode;
  }

  /**
   * Join an existing room
   * @returns Player ID and current player list
   * @throws Error if room doesn't exist or player already in a room
   */
  joinRoom(roomCode: string, socketId: string, playerName: string): { playerId: string; players: Player[] } {
    // Check if socket already in a room
    if (this.socketToPlayer.has(socketId)) {
      throw new Error("Already in a room");
    }

    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error("Room not found");
    }

    const playerId = this.generatePlayerId();
    const player: InternalPlayer = {
      playerId,
      socketId,
      name: playerName,
      connected: true,
    };

    room.players.set(playerId, player);
    this.socketToPlayer.set(socketId, { roomCode, playerId });

    // Convert internal players to protocol Player type
    const players: Player[] = Array.from(room.players.values()).map(p => ({
      playerId: p.playerId,
      name: p.name,
      connected: p.connected,
    }));

    return { playerId, players };
  }

  /**
   * Leave the current room
   */
  leaveRoom(socketId: string): { roomCode: string; playerId: string } | null {
    const lookup = this.socketToPlayer.get(socketId);
    if (!lookup) {
      return null;
    }

    const { roomCode, playerId } = lookup;
    const room = this.rooms.get(roomCode);
    if (!room) {
      this.socketToPlayer.delete(socketId);
      return null;
    }

    // Remove player from room
    room.players.delete(playerId);
    this.socketToPlayer.delete(socketId);

    // If room is empty, delete it
    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
    } else if (room.hostId === playerId) {
      // Transfer host to next player
      const nextPlayer = Array.from(room.players.values())[0];
      room.hostId = nextPlayer.playerId;
    }

    return { roomCode, playerId };
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnect(socketId: string): { roomCode: string; playerId: string } | null {
    const lookup = this.socketToPlayer.get(socketId);
    if (!lookup) {
      return null;
    }

    const { roomCode, playerId } = lookup;
    const room = this.rooms.get(roomCode);
    if (!room) {
      this.socketToPlayer.delete(socketId);
      return null;
    }

    const player = room.players.get(playerId);
    if (!player) {
      this.socketToPlayer.delete(socketId);
      return null;
    }

    // If game hasn't started, remove player completely
    if (!room.started) {
      room.players.delete(playerId);
      this.socketToPlayer.delete(socketId);

      // If room is empty, delete it
      if (room.players.size === 0) {
        this.rooms.delete(roomCode);
      } else if (room.hostId === playerId) {
        // Transfer host to next player
        const nextPlayer = Array.from(room.players.values())[0];
        room.hostId = nextPlayer.playerId;
      }

      return { roomCode, playerId };
    }

    // If game has started, mark as disconnected but keep in room
    player.connected = false;
    player.socketId = null;
    this.socketToPlayer.delete(socketId);

    return { roomCode, playerId };
  }

  /**
   * Get a room by room code
   */
  getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }

  /**
   * Get a room by socket ID
   */
  getRoomBySocketId(socketId: string): Room | undefined {
    const lookup = this.socketToPlayer.get(socketId);
    if (!lookup) {
      return undefined;
    }
    return this.rooms.get(lookup.roomCode);
  }

  /**
   * Generate a unique 4-character room code (A-Z excluding I and O)
   */
  private generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // 24 chars (no I or O)

    let code: string;
    do {
      code = "";
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));

    return code;
  }

  /**
   * Generate a unique player ID using UUID
   */
  private generatePlayerId(): string {
    return crypto.randomUUID();
  }
}
