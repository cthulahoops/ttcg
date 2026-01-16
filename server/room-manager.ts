import { Game, runGame } from "../shared/game.js";
import type { Player } from "../shared/protocol.js";
import { NetworkController } from "./controllers.js";
import { newGame } from "./game-server.js";

interface InternalPlayer {
  playerId: string; // UUID (separate from socket ID)
  socketId: string | null; // Current socket (null if disconnected)
  name: string;
  connected: boolean;
}

interface Room {
  code: string; // 4-char uppercase (A-Z minus I/O)
  players: Map<string, InternalPlayer>;
  game: Game | null; // null for MVP, reserved for future
  started: boolean; // false for MVP, reserved for future
  createdAt: number; // Timestamp for cleanup
  controllers: Map<string, NetworkController>; // Player ID to controller mapping
}

export class RoomManager {
  private rooms: Map<string, Room>; // roomCode → Room
  private socketToPlayer: Map<
    string,
    {
      // socketId → player lookup
      roomCode: string;
      playerId: string;
    }
  >;

  constructor() {
    this.rooms = new Map();
    this.socketToPlayer = new Map();
  }

  /**
   * Join a room, creating it if it doesn't exist
   * @returns Player ID and current player list
   * @throws Error if socket already in a different room
   */
  joinRoom(
    roomCode: string,
    socketId: string,
    playerName: string,
    playerId: string
  ): { playerId: string; players: Player[] } {
    // Check if socket already in a room
    const existingLookup = this.socketToPlayer.get(socketId);
    if (existingLookup) {
      // If trying to join the same room, allow reconnection
      if (existingLookup.roomCode === roomCode && existingLookup.playerId === playerId) {
        // Reconnection - just update the player info
        const room = this.rooms.get(roomCode)!;
        const player = room.players.get(playerId);
        if (player) {
          player.socketId = socketId;
          player.connected = true;
          player.name = playerName; // Update name in case it changed
        }

        const players: Player[] = Array.from(room.players.values()).map((p) => ({
          name: p.name,
          connected: p.connected,
        }));

        return { playerId, players };
      }
      throw new Error("Already in a room");
    }

    // Create room if it doesn't exist
    let room = this.rooms.get(roomCode);
    if (!room) {
      room = {
        code: roomCode,
        players: new Map(),
        game: null,
        started: false,
        createdAt: Date.now(),
        controllers: new Map(),
      };
      this.rooms.set(roomCode, room);
    }

    // Check if player already exists in room (reconnection case)
    let player = room.players.get(playerId);
    if (player) {
      // Reconnecting - update socket and connection status
      player.socketId = socketId;
      player.connected = true;
      player.name = playerName; // Update name in case it changed
    } else {
      // New player - check for name uniqueness
      const existingPlayerWithName = Array.from(room.players.values()).find(
        (p) => p.name === playerName
      );
      if (existingPlayerWithName) {
        throw new Error(`Player name "${playerName}" is already taken in this room`);
      }

      player = {
        playerId,
        socketId,
        name: playerName,
        connected: true,
      };
      room.players.set(playerId, player);
    }

    this.socketToPlayer.set(socketId, { roomCode, playerId });

    // Convert internal players to protocol Player type (without exposing playerIds)
    const players: Player[] = Array.from(room.players.values()).map((p) => ({
      name: p.name,
      connected: p.connected,
    }));

    return { playerId, players };
  }

  /**
   * Leave the current room
   */
  leaveRoom(socketId: string): { roomCode: string; playerId: string; playerName: string } | null {
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

    // Get player name before removing
    const player = room.players.get(playerId);
    const playerName = player?.name || "";

    // Remove player from room
    room.players.delete(playerId);
    this.socketToPlayer.delete(socketId);

    // If room is empty, delete it
    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
    }

    return { roomCode, playerId, playerName };
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnect(
    socketId: string
  ): { roomCode: string; playerId: string; playerName: string } | null {
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

    const playerName = player.name;

    // If game hasn't started, remove player completely
    if (!room.started) {
      room.players.delete(playerId);
      this.socketToPlayer.delete(socketId);

      // If room is empty, delete it
      if (room.players.size === 0) {
        this.rooms.delete(roomCode);
      }

      return { roomCode, playerId, playerName };
    }

    // If game has started, mark as disconnected but keep in room
    player.connected = false;
    player.socketId = null;
    this.socketToPlayer.delete(socketId);

    return { roomCode, playerId, playerName };
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
   * Get room code for a socket ID
   */
  getRoomCodeBySocketId(socketId: string): string | undefined {
    const lookup = this.socketToPlayer.get(socketId);
    return lookup?.roomCode;
  }

  /**
   * Start the game for a room
   * @param socketId - The socket ID of the player starting the game
   * @param sendToPlayer - Callback to send a message to a specific player
   * @returns The initialized game
   * @throws Error if room doesn't exist or game already started
   */
  async startGame(
    socketId: string,
    sendToPlayer: (playerId: string, message: string) => void
  ): Promise<Game> {
    const lookup = this.socketToPlayer.get(socketId);
    if (!lookup) {
      throw new Error("Not in a room");
    }

    const { roomCode } = lookup;
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error("Room not found");
    }

    if (room.started) {
      throw new Error("Game already started");
    }

    room.started = true;
    let playAgain = true;
    let game: Game | null = null;

    while (playAgain) {
      // Create a NetworkController for each player and build seat-to-player mapping
      const playerList = Array.from(room.players.values());
      const controllers = playerList.map((player) => {
        const controller = new NetworkController(
          (message) => {
            sendToPlayer(player.playerId, JSON.stringify(message));
          },
          player.playerId,
          player.name
        );
        room.controllers.set(player.playerId, controller);
        return controller;
      });

      // Initialize the game (this shuffles controllers)
      game = newGame(controllers);
      room.game = game;

      // Set up state change callback to broadcast game state
      game.onStateChange = () => {
        for (const seat of game!.seats) {
          seat.controller.sendGameState(game!, seat);
        }
      };

      // Set up log callback to broadcast game log messages
      game.onLog = (
        line: string,
        important?: boolean,
        options?: { visibleTo?: number[]; hiddenMessage?: string }
      ) => {
        // Broadcast log message to all players
        for (const playerId of room.players.keys()) {
          let messageToSend = line;

          // If visibility is restricted, check if this player can see the detailed message
          if (options?.visibleTo && options?.hiddenMessage) {
            // Find the seat for this player
            const controller = room.controllers.get(playerId);
            const seat = game!.seats.find((s) => s.controller === controller);
            const seatIndex = seat?.seatIndex;

            // If player's seat is not in visibleTo, use the hidden message
            if (seatIndex === undefined || !options.visibleTo.includes(seatIndex)) {
              messageToSend = options.hiddenMessage;
            }
          }

          sendToPlayer(
            playerId,
            JSON.stringify({
              type: "game_log",
              line: messageToSend,
              important,
            })
          );
        }
      };

      // Run the game loop and wait for it to complete
      await runGame(game);

      // Game is over - ask all players if they want to play again
      // First response wins
      playAgain = await this.askPlayAgain(room);

      if (playAgain) {
        // Clear controllers for new game
        room.controllers.clear();
        room.game = null;

        // Clear game log for all players before starting new game
        const players = Array.from(room.players.values()).map((p) => ({
          name: p.name,
          connected: p.connected,
        }));
        for (const playerId of room.players.keys()) {
          sendToPlayer(
            playerId,
            JSON.stringify({
              type: "game_reset",
              players,
            })
          );
        }
      }
    }

    // Player chose not to play again - reset room to lobby state
    this.resetRoomToLobby(room, sendToPlayer);

    return game!;
  }

  /**
   * Ask all players if they want to play again. First response wins.
   * Times out after 1 hour, defaulting to false.
   */
  private async askPlayAgain(room: Room): Promise<boolean> {
    const PLAY_AGAIN_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

    const options = {
      title: "Game Over",
      message: "Would you like to play again?",
      buttons: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
    };

    // Ask each controller - first response wins
    const controllerPromises = Array.from(room.controllers.values()).map(
      (controller) => controller.chooseButton(options)
    );

    // Timeout defaults to false
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), PLAY_AGAIN_TIMEOUT_MS);
    });

    return Promise.race([...controllerPromises, timeoutPromise]);
  }

  /**
   * Reset room to lobby state (no active game)
   */
  private resetRoomToLobby(
    room: Room,
    sendToPlayer: (playerId: string, message: string) => void
  ): void {
    room.game = null;
    room.started = false;
    room.controllers.clear();

    // Notify all players to return to lobby
    const players = Array.from(room.players.values()).map((p) => ({
      name: p.name,
      connected: p.connected,
    }));

    for (const playerId of room.players.keys()) {
      sendToPlayer(
        playerId,
        JSON.stringify({
          type: "game_reset",
          players,
        })
      );
    }
  }

  /**
   * Handle a decision response from a player
   * @param socketId - The socket ID of the player sending the response
   * @param requestId - The request ID this response is for
   * @param response - The decision response data
   * @throws Error if player is not in a room or not in a game
   */
  handleDecisionResponse(socketId: string, requestId: string, response: unknown): void {
    const lookup = this.socketToPlayer.get(socketId);
    if (!lookup) {
      throw new Error("Not in a room");
    }

    const { roomCode, playerId } = lookup;
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new Error("Room not found");
    }

    if (!room.started) {
      throw new Error("Game not started");
    }

    const controller = room.controllers.get(playerId);
    if (!controller) {
      throw new Error("Controller not found");
    }

    controller.handleResponse(requestId, response);
  }
}
