# Network Multiplayer Plan

## Executive Summary

This plan adds network multiplayer to the trick-taking game while **preserving the existing async game loop architecture**. The key insight is that the current `Controller` abstraction already provides perfect extension points—we just need to add a `NetworkController` that communicates decisions over the network instead of waiting for local DOM events.

## Architecture Overview

### Current Strengths (Preserved)
✅ **Async Game Loop**: The game flow is already Promise-based with clean resumption points
✅ **Controller Abstraction**: `HumanController` and `AIController` already separate input from game logic
✅ **Centralized State**: `Game` class manages all game state in one place
✅ **Separated Display**: Rendering is decoupled from game logic
✅ **Sequential Flow**: Each decision point naturally awaits the next player

### New Components (Added)
- **NetworkController**: New controller that communicates over WebSocket
- **GameServer**: Node.js server that hosts game rooms and relays messages
- **State Synchronization**: Protocol for keeping all clients in sync
- **Lobby System**: UI for creating/joining network games

---

## Part 1: Technology Selection

### 1.1 Real-Time Communication Libraries

#### Option A: Socket.IO ✅ **RECOMMENDED**

**Why Socket.IO is Better for This Project:**

```typescript
// Client
import { io } from 'socket.io-client';
const socket = io('https://your-server.com');

// Clean event-based API
socket.emit('selectCard', { card: selectedCard });
socket.on('stateUpdate', (gameState) => { /* render */ });

// Server
import { Server } from 'socket.io';
const io = new Server(3000);

// Built-in room management
io.to(roomCode).emit('stateUpdate', gameState);
```

**Advantages:**
- ✅ **Automatic Reconnection**: Built-in exponential backoff, maintains connection through network issues
- ✅ **Room Management**: First-class support for game rooms (`socket.join(roomCode)`, `io.to(roomCode).emit()`)
- ✅ **Event-Based API**: Cleaner than manual JSON parsing (`socket.on('eventName')` vs `switch(message.type)`)
- ✅ **Fallback Transports**: Auto-degrades to long polling if WebSocket blocked by corporate firewall
- ✅ **Acknowledgments**: Can wait for confirmation that message was received: `socket.emit('move', data, (ack) => {})`
- ✅ **TypeScript Support**: Excellent type safety with typed events
- ✅ **Battle-Tested**: Used by Microsoft, Trello, and millions of apps
- ✅ **Binary Support**: Can send ArrayBuffers for optimized state deltas
- ✅ **Namespace Support**: Can separate lobby vs game connections

**Disadvantages:**
- ❌ Larger bundle size: ~52KB minified (vs 0KB for native WebSocket)
- ❌ Slightly more latency overhead (~5-10ms) due to protocol wrapping
- ❌ Requires Socket.IO on both client and server (can't use with generic WebSocket server)

**Bundle Size Analysis:**
```
socket.io-client: 52KB minified
ws (raw WebSocket): 0KB (browser native)
Difference: 52KB = ~0.15s on 3G connection (acceptable for turn-based game)
```

**Code Example - Type-Safe Events:**
```typescript
// shared/events.ts
interface ServerToClientEvents {
  stateUpdate: (state: SerializedGameState) => void;
  requestInput: (request: InputRequest) => void;
  playerJoined: (playerName: string) => void;
  error: (message: string) => void;
}

interface ClientToServerEvents {
  joinRoom: (roomCode: string) => void;
  selectCard: (card: Card) => void;
  chooseButton: (value: string) => void;
}

// Client
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(serverUrl);
socket.on('stateUpdate', (state) => {
  // `state` is fully typed!
});

// Server
const io = new Server<ClientToServerEvents, ServerToClientEvents>();
```

**Reconnection Handling (Free with Socket.IO):**
```typescript
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server kicked us, manually reconnect
    socket.connect();
  }
  // Otherwise auto-reconnects with exponential backoff
});

socket.on('connect', () => {
  // Rejoin room after reconnection
  if (currentRoomCode) {
    socket.emit('rejoinRoom', currentRoomCode, currentSeatIndex);
  }
});
```

#### Option B: Raw WebSocket (ws library)

**When to Use:**
- Minimal bundle size is critical
- Very simple protocol (only 2-3 message types)
- Don't need room management
- Building a learning project

**Code Example:**
```typescript
// Client (browser native)
const ws = new WebSocket('ws://localhost:8080');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  switch(message.type) {
    case 'STATE_UPDATE': handleStateUpdate(message); break;
    // ... manual routing
  }
};

// Server
import { WebSocketServer } from 'ws';
const wss = new WebSocketServer({ port: 8080 });
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    // Manual message parsing, routing, room management
  });
});
```

**Disadvantages for This Project:**
- ❌ No automatic reconnection (must implement manually)
- ❌ No built-in rooms (must track `roomCode → Set<WebSocket>` manually)
- ❌ Must parse JSON and route messages yourself
- ❌ No fallback if WebSocket blocked by firewall
- ❌ No acknowledgment support

**Verdict:** Raw WebSocket adds ~200 lines of boilerplate that Socket.IO provides for free. The 52KB cost is worth it.

#### Option C: WebRTC (peer-to-peer)

**Best For:**
- Video/audio chat
- File transfer
- Ultra-low latency (<20ms)
- No server dependency after signaling

**Code Example:**
```typescript
// Requires signaling server first
const pc = new RTCPeerConnection();
const channel = pc.createDataChannel('game');

channel.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Handle message
};
```

**Why Not for This Project:**
- ❌ **Complex Setup**: Requires STUN/TURN servers, signaling, ICE negotiation
- ❌ **NAT Traversal Issues**: ~10-15% of connections fail due to strict NATs
- ❌ **Hard to Debug**: Connection issues are cryptic
- ❌ **Overkill**: Don't need <20ms latency for turn-based game (100ms is fine)
- ❌ **4-Player Mesh**: Each player needs 3 WebRTC connections (complex)

**Verdict:** Too complex for the benefit. Only consider if building real-time action game.

#### Option D: Partykit / PartyServer

**What It Is:**
Platform for building multiplayer apps with automatic scaling, room management, and persistence.

```typescript
// server/party.ts
export default class GameParty implements Party.Server {
  constructor(public party: Party.Party) {}

  onConnect(conn: Party.Connection) {
    // New player joined
  }

  onMessage(message: string, sender: Party.Connection) {
    // Broadcast to room
    this.party.broadcast(message, [sender.id]);
  }
}
```

**Advantages:**
- ✅ Zero-config deployment
- ✅ Automatic room persistence
- ✅ Built-in scaling (rooms distributed across servers)
- ✅ Hibernation (rooms sleep when empty, wake on join)
- ✅ WebSocket + HTTP API

**Disadvantages:**
- ❌ **Vendor Lock-In**: Can't easily self-host or migrate
- ❌ **Cost**: Free tier limited (100 rooms, then $10/month)
- ❌ **Less Control**: Can't customize server infra
- ❌ **Debugging**: Harder to debug remote deployment issues

**Verdict:** Great for rapid prototyping or if you don't want to manage servers. But Socket.IO gives more control.

#### Option E: Colyseus (Game Server Framework)

**What It Is:**
Framework specifically for multiplayer games with state synchronization.

```typescript
// Define game state schema
class GameState extends Schema {
  @type("number") currentPlayer: number;
  @type([Player]) players = new ArraySchema<Player>();
}

class GameRoom extends Room<GameState> {
  onCreate() {
    this.setState(new GameState());
  }

  onMessage(client, message) {
    // Handle player actions
  }
}
```

**Advantages:**
- ✅ **State Sync**: Automatic delta encoding (only send changed fields)
- ✅ **Schema-Based**: Define state structure, auto-serialize
- ✅ **Game-Specific**: Built for turn-based and real-time games
- ✅ **Matchmaking**: Built-in lobby and matchmaking
- ✅ **Client SDKs**: JavaScript, Unity, Cocos, Defold

**Disadvantages:**
- ❌ **Learning Curve**: New framework to learn (Schema, Room lifecycle)
- ❌ **Opinionated**: Must structure code around Colyseus patterns
- ❌ **Bundle Size**: Client SDK is ~80KB (larger than Socket.IO)
- ❌ **Overkill**: We already have clean state management (Game class)

**Verdict:** Best if building from scratch or need automatic state sync. For this project, our existing architecture is cleaner.

#### Option F: Server-Sent Events (SSE)

**What It Is:**
One-way server → client push over HTTP.

```typescript
// Server
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache'
});
res.write(`data: ${JSON.stringify(gameState)}\n\n`);

// Client
const eventSource = new EventSource('/game-stream');
eventSource.onmessage = (event) => {
  const state = JSON.parse(event.data);
};
```

**Why Not:**
- ❌ **One-Way Only**: Client → server requires separate POST requests
- ❌ **No Binary**: Text-only protocol
- ❌ **Limited Browser Support**: Max 6 concurrent connections per domain

**Verdict:** Not suitable for bidirectional game communication.

---

### 1.2 Technology Recommendation Matrix

| Feature | Socket.IO | Raw WS | WebRTC | Partykit | Colyseus |
|---------|-----------|--------|---------|----------|----------|
| **Auto Reconnect** | ✅ Built-in | ❌ Manual | ⚠️ Complex | ✅ Yes | ✅ Yes |
| **Room Management** | ✅ Native | ❌ Manual | ❌ N/A | ✅ Native | ✅ Native |
| **Bundle Size** | 52KB | 0KB | ~100KB | ~60KB | ~80KB |
| **Learning Curve** | Low | Low | High | Medium | High |
| **Latency** | ~50ms | ~40ms | ~10ms | ~60ms | ~50ms |
| **Fallback Transport** | ✅ Yes | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Self-Hostable** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **Type Safety** | ✅✅ Excellent | ⚠️ Manual | ⚠️ Manual | ✅ Good | ✅✅ Excellent |
| **State Sync** | ❌ Manual | ❌ Manual | ❌ Manual | ⚠️ Basic | ✅✅ Auto |

**Final Recommendation: Socket.IO**
- Best balance of features vs complexity
- 52KB is negligible for modern web
- Saves 200+ lines of boilerplate code
- Production-ready with great TypeScript support

---

### 1.3 Server Hosting Options

#### Option A: Render (Free Tier) ✅ **RECOMMENDED FOR MVP**

**Specs:**
- Free: 750 hours/month (enough for 24/7 uptime)
- Auto-deploy from GitHub
- HTTPS + WebSocket support
- Sleeps after 15min inactivity (wakes in ~30s)
- 512MB RAM, shared CPU

**Pros:**
- ✅ Zero cost for development
- ✅ One-click deploy
- ✅ Auto-SSL certificates
- ✅ Great for testing

**Cons:**
- ❌ Cold starts (30s wake time) - bad UX for first player
- ❌ Sleep kills active games
- ❌ Single region (US or EU)

**Deploy:**
```bash
# render.yaml
services:
  - type: web
    name: ttcg-server
    env: node
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    healthCheckPath: /health
```

#### Option B: Railway ($5-10/month)

**Specs:**
- Always-on (no sleep)
- $5/month base + usage
- 8GB RAM, 8 vCPU shared
- Multiple regions
- WebSocket support

**Pros:**
- ✅ No cold starts
- ✅ Better performance
- ✅ Usage-based pricing (scales down when idle)

**Cons:**
- ❌ Costs money
- ❌ Must monitor costs

#### Option C: Fly.io (Pay-as-you-go)

**Specs:**
- Free tier: 3 shared-CPU VMs, 160GB bandwidth
- Global edge network
- ~$2-5/month for small game server

**Pros:**
- ✅ Multi-region (low latency worldwide)
- ✅ No sleep (within free tier)
- ✅ Great WebSocket support

**Cons:**
- ❌ More complex config
- ❌ Pricing can be unpredictable

#### Option D: Cloudflare Workers + Durable Objects

**What It Is:**
Serverless WebSocket handlers that run on Cloudflare's edge.

```typescript
export default {
  async fetch(request, env) {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader === 'websocket') {
      // Handle WebSocket
      return handleWebSocket(request, env);
    }
  }
}
```

**Pros:**
- ✅ Global edge (ultra-low latency)
- ✅ Free tier: 1M requests/month
- ✅ Auto-scaling
- ✅ No server management

**Cons:**
- ❌ **Complex**: Different mental model (actors/durable objects)
- ❌ **Limitations**: 128MB memory, 30s CPU time
- ❌ **Lock-In**: Cloudflare-specific

**Verdict:** Overkill for initial launch. Consider for scale (1000+ concurrent games).

#### Option E: Self-Hosted (VPS)

**Providers:**
- DigitalOcean: $4/month (1GB RAM)
- Linode: $5/month
- Hetzner: €3.79/month

**Pros:**
- ✅ Full control
- ✅ Predictable costs
- ✅ Can install custom tools

**Cons:**
- ❌ Must manage server (updates, security, monitoring)
- ❌ Single region (unless pay for multiple)
- ❌ No auto-scaling

**Verdict:** Best for experienced developers who want full control.

---

### 1.4 State Synchronization Strategies

#### Strategy A: Full State Broadcast (Simple) ✅ **START HERE**

**How It Works:**
- Host sends complete game state after every action
- Guests replace their entire state

**Code:**
```typescript
// After every action
socket.emit('stateUpdate', game.serialize());
```

**State Size Estimate:**
```
Typical game state:
- 4 players × 9 cards × 50 bytes = 1.8KB
- Trick history: ~500 bytes
- Metadata: ~200 bytes
Total: ~2.5KB per update

Over full game:
- 36 card plays × 2.5KB = 90KB total
- ~2KB/second during active play
```

**Pros:**
- ✅ Simplest to implement (20 lines of code)
- ✅ Can't get out of sync (always overwrite)
- ✅ Easy to debug (just log the state)
- ✅ 2.5KB is tiny for modern internet

**Cons:**
- ❌ Sends redundant data (most state unchanged)
- ❌ Bandwidth scales with state size

**Verdict:** Perfect for MVP. 2.5KB every few seconds is negligible.

#### Strategy B: Delta Encoding (Optimization)

**How It Works:**
- Only send fields that changed since last update
- Guest applies patch to existing state

**Code:**
```typescript
// After card play
const delta = {
  type: 'CARD_PLAYED',
  seatIndex: 2,
  card: { suit: 'Mountains', value: 5 },
  currentTrick: [...game.currentTrick]
};
socket.emit('stateDelta', delta);
```

**Typical Delta Sizes:**
```
- Card played: ~100 bytes
- Trick won: ~200 bytes
- Character assigned: ~50 bytes

Savings: 100 bytes vs 2500 bytes = 96% reduction
```

**Pros:**
- ✅ 25× smaller messages
- ✅ Lower latency (less to send)
- ✅ Better for mobile/slow connections

**Cons:**
- ❌ More complex (must handle each delta type)
- ❌ Can get out of sync (need periodic full sync)
- ❌ Harder to debug

**Verdict:** Optimize later if bandwidth becomes an issue (unlikely).

#### Strategy C: Operational Transform (Advanced)

**What It Is:**
Algorithm for handling concurrent edits (like Google Docs).

**Why Not:**
- ❌ Turn-based game has no concurrent edits
- ❌ Massive complexity for no benefit

**Verdict:** Not applicable to turn-based games.

---

### 1.5 Final Technology Stack

**Recommended Stack:**

```
Frontend:
├── TypeScript (existing)
├── socket.io-client (52KB)
└── No framework (vanilla JS/DOM)

Backend:
├── Node.js 20 LTS
├── socket.io (server)
├── TypeScript
└── Express (for health checks, static files)

Hosting:
├── Render (free tier for MVP)
└── Migrate to Railway/Fly.io for production

State Sync:
├── Full state broadcast initially
└── Add delta encoding if needed (unlikely)

Development:
├── tsx (TypeScript executor)
├── nodemon (auto-reload)
└── Playwright (E2E tests)
```

**package.json (server):**
```json
{
  "name": "ttcg-server",
  "type": "module",
  "scripts": {
    "dev": "nodemon --exec tsx src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "socket.io": "^4.7.2",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "nodemon": "^3.0.2"
  }
}
```

---

## Part 2: Core Architecture

### 2.1 Network Controller (Socket.IO)

Create a new `NetworkController` class that implements the same `Controller` interface:

```typescript
// network.ts
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../shared/events';
import type { Controller, ChoiceButtonOptions, ChoiceCardOptions, Card } from './types';

export class NetworkController extends Controller {
  private socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  private seatIndex: number;
  private responseHandlers: Map<string, (value: any) => void>;

  constructor(socket: Socket<ServerToClientEvents, ClientToServerEvents>, seatIndex: number) {
    super();
    this.socket = socket;
    this.seatIndex = seatIndex;
    this.responseHandlers = new Map();

    // Listen for input responses from server
    this.socket.on('inputResponse', ({ requestId, value }) => {
      const handler = this.responseHandlers.get(requestId);
      if (handler) {
        handler(value);
        this.responseHandlers.delete(requestId);
      }
    });
  }

  // Wait for remote player to choose a button
  async chooseButton<T>(options: ChoiceButtonOptions<T>): Promise<T> {
    return new Promise((resolve) => {
      const requestId = this.generateId();

      // Send request to server, which forwards to remote player
      this.socket.emit('requestInput', {
        seatIndex: this.seatIndex,
        requestId,
        inputType: 'chooseButton',
        options: {
          title: options.title,
          message: options.message,
          buttons: options.buttons.map(b => ({
            label: b.label,
            value: b.value
          })),
          info: options.info
        }
      });

      // Register handler for response
      this.responseHandlers.set(requestId, resolve);
    });
  }

  // Wait for remote player to choose a card
  async chooseCard<T>(options: ChoiceCardOptions<T>): Promise<T> {
    return new Promise((resolve) => {
      const requestId = this.generateId();

      this.socket.emit('requestInput', {
        seatIndex: this.seatIndex,
        requestId,
        inputType: 'chooseCard',
        options: {
          title: options.title,
          message: options.message,
          cards: options.cards,
          info: options.info
        }
      });

      this.responseHandlers.set(requestId, resolve);
    });
  }

  // Wait for remote player to select a card from their hand
  async selectCard(availableCards: Card[], renderCards: () => void): Promise<Card> {
    return new Promise((resolve) => {
      const requestId = this.generateId();

      // Don't call renderCards - remote player has their own display

      this.socket.emit('requestInput', {
        seatIndex: this.seatIndex,
        requestId,
        inputType: 'selectCard',
        options: { availableCards }
      });

      this.responseHandlers.set(requestId, resolve);
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup when controller is no longer needed
  dispose(): void {
    this.responseHandlers.clear();
  }
}
```

**Key Improvements with Socket.IO:**
- ✅ **Type-Safe Events**: `socket.emit('requestInput', ...)` is fully typed
- ✅ **Cleaner API**: No manual JSON parsing or message type switching
- ✅ **Built-in Event Routing**: Socket.IO handles message delivery to right handler
- ✅ **Auto Reconnection**: If connection drops, Socket.IO reconnects automatically

**Key Insight**: The `NetworkController` has the **exact same interface** as `HumanController` and `AIController`. The game loop doesn't know or care whether it's waiting for:
- A DOM click event (HumanController)
- A random AI delay (AIController)
- A Socket.IO message (NetworkController)

All it sees is an async method that returns a Promise!

### 1.2 Game Roles: Host vs Guest

In network multiplayer, one player **hosts** the game (runs the game loop) while others are **guests** (send input and receive state updates).

```typescript
// game.ts - Modified newGame() function
export async function newGame(mode: GameMode, networkRole: 'local' | 'host' | 'guest' = 'local') {
  if (networkRole === 'guest') {
    // Guest mode: Don't run game loop locally
    // Just display the game state and send input to host
    return await joinNetworkGame();
  }

  // Host/local mode: Run the game loop as normal
  const seats = createSeats(mode);
  const gameState = new Game(/* ... */);

  if (networkRole === 'host') {
    // Broadcast initial state to all guests
    broadcastGameState(gameState);
  }

  await runGame(gameState);
}
```

**Host Responsibilities**:
- Run the complete `runGame()` async loop
- Make all game logic decisions (trick winners, objective checks, etc.)
- Broadcast state updates to all guests after each action
- Wait for `NetworkController` input from remote players

**Guest Responsibilities**:
- Display the current game state (received from host)
- When it's their turn, use `HumanController` to get local input
- Send the choice back to host via WebSocket
- Receive and display state updates from host

---

## Part 2: State Synchronization Protocol

### 2.1 Message Types

Define a clear protocol for all client-server communication:

```typescript
// protocol.ts

// Host → Guest: Game state updates
interface StateUpdateMessage {
  type: 'STATE_UPDATE';
  gameState: SerializedGameState;  // Full game state snapshot
  event?: string;  // "CARD_PLAYED" | "TRICK_WON" | "CHARACTER_ASSIGNED" etc.
}

// Host → Guest: Request input from a player
interface InputRequestMessage {
  type: 'CHOOSE_BUTTON_REQUEST' | 'CHOOSE_CARD_REQUEST' | 'SELECT_CARD_REQUEST';
  requestId: string;
  seatIndex: number;
  options: any;  // Choice-specific options
}

// Guest → Host: Player input response
interface InputResponseMessage {
  type: 'INPUT_RESPONSE';
  requestId: string;
  seatIndex: number;
  value: any;  // Selected button value, card, etc.
}

// Guest → Host: Join game room
interface JoinGameMessage {
  type: 'JOIN_GAME';
  roomCode: string;
  playerName: string;
}

// Host → Guest: Seat assignment
interface SeatAssignmentMessage {
  type: 'SEAT_ASSIGNMENT';
  seatIndex: number;
  playerNames: string[];  // All players in the game
}
```

### 2.2 Game State Serialization

The `Game` class needs to be serializable for network transmission:

```typescript
// game.ts
export class Game {
  // ... existing properties ...

  serialize(): SerializedGameState {
    return {
      playerCount: this.playerCount,
      numCharacters: this.numCharacters,
      seats: this.seats.map(seat => ({
        seatIndex: seat.seatIndex,
        character: seat.character,
        threatCard: seat.threatCard,
        tricksWonCount: seat.tricksWon.length,
        playedCards: seat.playedCards,
        handCards: seat.hand?.getAvailableCards() || [],  // Guest sees only available cards
        isPyramid: seat.isPyramid,
        isLocalPlayer: false  // Set by receiver
      })),
      currentTrick: this.currentTrick,
      currentPlayer: this.currentPlayer,
      currentTrickNumber: this.currentTrickNumber,
      leadSuit: this.leadSuit,
      ringsBroken: this.ringsBroken,
      lostCard: this.lostCard,
      lastTrickWinner: this.lastTrickWinner,
      tricksToPlay: this.tricksToPlay,
      gameLog: getGameLogHistory()  // Include recent log entries
    };
  }

  static deserialize(data: SerializedGameState, localSeatIndex: number): Game {
    // Reconstruct Game instance from serialized data
    // Mark localSeatIndex seat as the local player
    // Create appropriate Hand types based on isPyramid, etc.
  }
}
```

**Important Design Decisions**:

1. **Authoritative Host**: The host's game state is the **source of truth**. Guests display what the host sends.

2. **Incremental Updates**: For performance, consider sending **delta updates** instead of full state snapshots for common actions like card plays.

3. **Hidden Information**: When serializing for a specific guest, **hide cards** they shouldn't see:
   - Other players' hands (unless revealed)
   - Unplayed pyramid cards
   - Unrevealed solitaire cards

```typescript
// Hide cards for a specific seat's view
serializeForSeat(viewerSeatIndex: number): SerializedGameState {
  const state = this.serialize();

  state.seats = state.seats.map((seat, idx) => {
    if (idx === viewerSeatIndex) {
      // Viewer can see their own full hand
      seat.isLocalPlayer = true;
      return seat;
    }

    // Hide other players' cards (unless revealed like Fatty Bolger)
    if (seat.handCards && !seat.handRevealed) {
      seat.handCards = seat.handCards.map(() => ({ hidden: true }));
    }

    return seat;
  });

  return state;
}
```

---

## Part 3: Server Implementation (Socket.IO)

### 3.1 Game Server with Socket.IO

Create a Socket.IO server with clean room management:

```typescript
// server/src/server.ts
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '../shared/events';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  },
  // Ping timeout: disconnect if no pong within 20s
  pingTimeout: 20000,
  // Ping interval: check connection every 25s
  pingInterval: 25000
});

interface GameRoom {
  roomCode: string;
  hostSocketId: string;
  playerSockets: Map<number, string>; // seatIndex → socketId
  playerNames: Map<number, string>;    // seatIndex → playerName
  maxPlayers: number;
  started: boolean;
  createdAt: number;
}

const rooms = new Map<string, GameRoom>();

// Health check endpoint (for hosting platforms)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Host creates a new game
  socket.on('createGame', ({ playerCount, playerName }, callback) => {
    const roomCode = generateRoomCode();

    const room: GameRoom = {
      roomCode,
      hostSocketId: socket.id,
      playerSockets: new Map([[0, socket.id]]), // Host is seat 0
      playerNames: new Map([[0, playerName]]),
      maxPlayers: playerCount,
      started: false,
      createdAt: Date.now()
    };

    rooms.set(roomCode, room);
    socket.join(roomCode);

    // Store room code on socket for cleanup
    socket.data.roomCode = roomCode;
    socket.data.seatIndex = 0;

    console.log(`Room created: ${roomCode} by ${playerName}`);

    callback({ success: true, roomCode, seatIndex: 0 });
  });

  // Guest joins existing game
  socket.on('joinGame', ({ roomCode, playerName }, callback) => {
    const room = rooms.get(roomCode);

    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    if (room.started) {
      callback({ success: false, error: 'Game already started' });
      return;
    }

    if (room.playerSockets.size >= room.maxPlayers) {
      callback({ success: false, error: 'Room is full' });
      return;
    }

    // Assign next available seat
    const seatIndex = room.playerSockets.size;
    room.playerSockets.set(seatIndex, socket.id);
    room.playerNames.set(seatIndex, playerName);

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.seatIndex = seatIndex;

    console.log(`${playerName} joined room ${roomCode} as seat ${seatIndex}`);

    // Notify all players in room
    io.to(roomCode).emit('playerJoined', {
      seatIndex,
      playerName,
      totalPlayers: room.playerSockets.size,
      playerNames: Array.from(room.playerNames.values())
    });

    // Check if room is full
    if (room.playerSockets.size === room.maxPlayers) {
      room.started = true;
      io.to(roomCode).emit('gameReady');
      console.log(`Room ${roomCode} is full, starting game`);
    }

    callback({
      success: true,
      seatIndex,
      playerNames: Array.from(room.playerNames.values())
    });
  });

  // Reconnect to existing game
  socket.on('rejoinGame', ({ roomCode, seatIndex }, callback) => {
    const room = rooms.get(roomCode);

    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    // Update socket mapping
    room.playerSockets.set(seatIndex, socket.id);
    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.seatIndex = seatIndex;

    console.log(`Player ${seatIndex} reconnected to room ${roomCode}`);

    // Host should re-send current state
    const hostSocketId = room.hostSocketId;
    io.to(hostSocketId).emit('playerReconnected', { seatIndex });

    callback({ success: true });
  });

  // Forward state updates from host to all guests
  socket.on('stateUpdate', (state) => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;

    // Broadcast to everyone except sender (host)
    socket.to(roomCode).emit('stateUpdate', state);
  });

  // Forward input requests from host to specific guest
  socket.on('requestInput', ({ seatIndex, requestId, inputType, options }) => {
    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room) return;

    const targetSocketId = room.playerSockets.get(seatIndex);
    if (targetSocketId) {
      io.to(targetSocketId).emit('requestInput', {
        requestId,
        inputType,
        options
      });
    }
  });

  // Forward input responses from guest to host
  socket.on('inputResponse', ({ requestId, value }) => {
    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room) return;

    const hostSocketId = room.hostSocketId;
    io.to(hostSocketId).emit('inputResponse', {
      requestId,
      seatIndex: socket.data.seatIndex,
      value
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);

    const roomCode = socket.data.roomCode;
    const seatIndex = socket.data.seatIndex;

    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        // Notify other players
        socket.to(roomCode).emit('playerDisconnected', { seatIndex });

        // If host disconnected, end the game
        if (socket.id === room.hostSocketId) {
          console.log(`Host disconnected from room ${roomCode}, cleaning up`);
          io.to(roomCode).emit('gameEnded', { reason: 'Host disconnected' });
          rooms.delete(roomCode);
        }
        // Guest will auto-reconnect if they come back
      }
    }
  });
});

// Cleanup old rooms every 10 minutes
setInterval(() => {
  const now = Date.now();
  const ROOM_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours

  for (const [roomCode, room] of rooms.entries()) {
    if (now - room.createdAt > ROOM_TIMEOUT) {
      console.log(`Cleaning up old room: ${roomCode}`);
      rooms.delete(roomCode);
    }
  }
}, 10 * 60 * 1000);

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  // Ensure uniqueness
  if (rooms.has(code)) {
    return generateRoomCode();
  }

  return code;
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

**Key Improvements with Socket.IO:**
- ✅ **No manual JSON parsing**: Event-based API (`socket.on('createGame')`)
- ✅ **Built-in rooms**: `socket.join(roomCode)`, `io.to(roomCode).emit()`
- ✅ **Auto reconnection**: Client reconnects automatically, we just update socket mapping
- ✅ **Callbacks**: Can acknowledge messages (`callback({ success: true })`)
- ✅ **Type safety**: Full TypeScript support for events
- ✅ **Connection metadata**: `socket.data` stores room and seat info

### 3.2 Shared Event Types

Create type-safe event definitions shared between client and server:

```typescript
// shared/events.ts
import type { Card, SerializedGameState } from '../types';

// Server → Client events
export interface ServerToClientEvents {
  // Lobby events
  playerJoined: (data: {
    seatIndex: number;
    playerName: string;
    totalPlayers: number;
    playerNames: string[];
  }) => void;

  playerDisconnected: (data: { seatIndex: number }) => void;

  playerReconnected: (data: { seatIndex: number }) => void;

  gameReady: () => void;

  gameEnded: (data: { reason: string }) => void;

  // Game events
  stateUpdate: (state: SerializedGameState) => void;

  requestInput: (data: {
    requestId: string;
    inputType: 'selectCard' | 'chooseButton' | 'chooseCard';
    options: any;
  }) => void;

  inputResponse: (data: {
    requestId: string;
    seatIndex: number;
    value: any;
  }) => void;

  error: (message: string) => void;
}

// Client → Server events
export interface ClientToServerEvents {
  // Lobby events
  createGame: (
    data: { playerCount: number; playerName: string },
    callback: (result: { success: boolean; roomCode?: string; seatIndex?: number; error?: string }) => void
  ) => void;

  joinGame: (
    data: { roomCode: string; playerName: string },
    callback: (result: { success: boolean; seatIndex?: number; playerNames?: string[]; error?: string }) => void
  ) => void;

  rejoinGame: (
    data: { roomCode: string; seatIndex: number },
    callback: (result: { success: boolean; error?: string }) => void
  ) => void;

  // Game events
  stateUpdate: (state: SerializedGameState) => void;

  requestInput: (data: {
    seatIndex: number;
    requestId: string;
    inputType: 'selectCard' | 'chooseButton' | 'chooseCard';
    options: any;
  }) => void;

  inputResponse: (data: {
    requestId: string;
    value: any;
  }) => void;
}
```

---

## Part 4: Client-Side Integration

### 4.1 Modified Game Flow (Host)

```typescript
// game.ts - Modified runGame() for network host
export async function runGame(gameState: Game, networkManager?: NetworkManager) {
  // Character assignment phase
  await runCharacterAssignment(gameState);

  if (networkManager) {
    await networkManager.broadcastState(gameState, 'CHARACTER_ASSIGNMENT_COMPLETE');
  }

  // Setup phase
  await runSetupPhase(gameState);

  if (networkManager) {
    await networkManager.broadcastState(gameState, 'SETUP_COMPLETE');
  }

  // Trick-taking phase
  await runTrickTakingPhase(gameState);

  if (networkManager) {
    await networkManager.broadcastState(gameState, 'GAME_COMPLETE');
  }
}

// game.ts - Modified selectCardFromPlayer() for network
async function selectCardFromPlayer(
  gameState: Game,
  playerIndex: number,
  legalMoves: Card[],
  networkManager?: NetworkManager
): Promise<Card> {
  const seat = gameState.seats[playerIndex];
  const renderCards = () => displayHands(gameState, playerIndex);

  // This works for ALL controller types!
  const selectedCard = await seat.controller.selectCard(legalMoves, renderCards);

  // After card is selected, broadcast the state update
  if (networkManager) {
    await networkManager.broadcastState(gameState, 'CARD_SELECTED');
  }

  return selectedCard;
}
```

**Critical Observation**: The game loop **doesn't change at all**! We just:
1. Add `NetworkManager` parameter to track network state
2. Broadcast state updates after key events
3. The `await seat.controller.selectCard()` line works identically whether the controller is Human, AI, or Network

### 4.2 Guest Client Implementation

```typescript
// networkGuest.ts
export class NetworkGuest {
  private ws: WebSocket;
  private seatIndex: number;
  private gameState: Game | null = null;

  constructor(roomCode: string) {
    this.ws = new WebSocket(`ws://localhost:8080`);

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    // Join the room
    this.ws.onopen = () => {
      this.ws.send(JSON.stringify({
        type: 'JOIN_GAME',
        roomCode
      }));
    };
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'SEAT_ASSIGNMENT':
        this.seatIndex = message.seatIndex;
        updateUI(`You are Player ${this.seatIndex + 1}`);
        break;

      case 'STATE_UPDATE':
        // Receive game state from host
        this.gameState = Game.deserialize(message.gameState, this.seatIndex);
        this.renderGameState();
        break;

      case 'CHOOSE_BUTTON_REQUEST':
        if (message.seatIndex === this.seatIndex) {
          this.handleChooseButtonRequest(message);
        }
        break;

      case 'CHOOSE_CARD_REQUEST':
        if (message.seatIndex === this.seatIndex) {
          this.handleChooseCardRequest(message);
        }
        break;

      case 'SELECT_CARD_REQUEST':
        if (message.seatIndex === this.seatIndex) {
          this.handleSelectCardRequest(message);
        }
        break;
    }
  }

  private async handleSelectCardRequest(message: any): Promise<void> {
    // Show the local player's cards and wait for them to pick one
    const humanController = new HumanController();
    const selectedCard = await humanController.selectCard(
      message.availableCards,
      () => displayHands(this.gameState!, this.seatIndex)
    );

    // Send the choice back to host
    this.ws.send(JSON.stringify({
      type: 'INPUT_RESPONSE',
      requestId: message.requestId,
      seatIndex: this.seatIndex,
      value: selectedCard
    }));
  }

  private renderGameState(): void {
    if (!this.gameState) return;

    // Render the game state just like in single-player mode
    displayHands(this.gameState, this.seatIndex);
    displayTrick(this.gameState);
    updateTricksDisplay(this.gameState);
    // ... etc
  }
}
```

**Guest Client Behavior**:
1. Connect to server and join room
2. Receive seat assignment from server
3. Wait for state updates from host
4. When it's their turn, use local `HumanController` to get input
5. Send input back to host via server
6. Update display when new state arrives

---

## Part 5: UI/UX for Multiplayer

### 5.1 Lobby Screen

Add a new lobby screen for network games:

```html
<!-- game.html - Add before game area -->
<div id="lobbyArea" style="display: none;">
  <h2>Multiplayer Lobby</h2>

  <div id="hostLobby">
    <h3>Host a Game</h3>
    <button id="hostGameBtn">Host Game</button>
    <div id="roomCodeDisplay" style="display: none;">
      Room Code: <span id="roomCode"></span>
      <p>Share this code with your friends!</p>
      <p>Waiting for players: <span id="playerCount">1</span> / <span id="maxPlayers">4</span></p>
    </div>
  </div>

  <div id="joinLobby">
    <h3>Join a Game</h3>
    <input type="text" id="roomCodeInput" placeholder="Enter room code" />
    <button id="joinGameBtn">Join Game</button>
  </div>

  <button id="backToMenuBtn">Back to Menu</button>
</div>
```

### 5.2 Connection Status Indicator

Show connection status during game:

```html
<div id="networkStatus" style="display: none;">
  <span id="connectionIndicator">🟢</span>
  <span id="connectionText">Connected</span>
  <span id="latencyText">Latency: 45ms</span>
</div>
```

### 5.3 Waiting for Other Players

Add visual feedback when waiting for remote players:

```typescript
// display.ts
export function showWaitingForPlayer(playerName: string): void {
  updateGameStatus(`Waiting for ${playerName}...`);

  // Optional: Add a spinner animation
  const statusElement = document.getElementById('gameStatus')!;
  statusElement.innerHTML += ' <span class="spinner">⏳</span>';
}
```

---

## Part 6: Implementation Phases

### Phase 1: Core Network Controller (Week 1)
- [ ] Create `NetworkController` class
- [ ] Implement message protocol (protocol.ts)
- [ ] Add game state serialization/deserialization
- [ ] Test with mock WebSocket (in-memory)

**Deliverable**: Network controller that can send/receive decisions locally

### Phase 2: Server Implementation (Week 2)
- [ ] Build WebSocket server (server/gameServer.ts)
- [ ] Implement room system (create/join/leave)
- [ ] Add message routing (host ↔ guests)
- [ ] Test with 2 browser tabs on localhost

**Deliverable**: Working local multiplayer on same machine

### Phase 3: Client Integration (Week 3)
- [ ] Add lobby UI (host/join screens)
- [ ] Integrate NetworkController into newGame()
- [ ] Implement host broadcasting logic
- [ ] Implement guest client (NetworkGuest class)
- [ ] Test full game flow with 2 players

**Deliverable**: 2-player network game working end-to-end

### Phase 4: Polish & Features (Week 4)
- [ ] Add connection status indicator
- [ ] Implement reconnection logic
- [ ] Add player names and avatars
- [ ] Test with 3-4 players
- [ ] Add error handling (disconnections, timeouts)
- [ ] Performance optimization (delta updates)

**Deliverable**: Polished 2-4 player network experience

### Phase 5: Deployment (Week 5)
- [ ] Deploy server to cloud (Render/Railway)
- [ ] Add HTTPS/WSS support
- [ ] Configure CORS and security
- [ ] Add analytics/logging
- [ ] Beta testing with real users

**Deliverable**: Live multiplayer game on the web

---

## Part 7: Code Changes Summary

### New Files
- `network.ts` - NetworkController class
- `protocol.ts` - Message type definitions
- `networkManager.ts` - Host broadcasting logic
- `networkGuest.ts` - Guest client logic
- `server/gameServer.ts` - WebSocket server
- `server/package.json` - Server dependencies

### Modified Files
- `game.ts` - Add optional NetworkManager parameter to runGame(), broadcast state updates
- `controllers.ts` - Export Controller base class
- `types.ts` - Add SerializedGameState interface
- `game.html` - Add lobby UI elements
- `game.css` - Add network status styles

### Minimal Changes
The beauty of this approach is that **95% of the game logic stays unchanged**. The async game loop, character definitions, hand types, and display code all work exactly as before. We just:
1. Add a new controller type
2. Add state broadcasting after key events
3. Add lobby UI for multiplayer setup

---

## Part 8: Technical Considerations

### 8.1 Latency & Performance
- **Typical latency**: 50-150ms per action (acceptable for turn-based game)
- **Optimization**: Send delta updates instead of full state for common actions
- **Caching**: Guest caches full state, applies incremental patches

### 8.2 Security
- **Input Validation**: Host validates all moves (even though guests send them)
- **Cheat Prevention**: Server doesn't trust client—host is authoritative
- **Hidden Information**: Serialize game state per-seat (hide opponent cards)
- **Authentication**: Optional: Add player accounts to prevent impersonation

### 8.3 Error Handling
- **Disconnections**: Implement reconnection with exponential backoff
- **Timeouts**: Auto-skip if player doesn't respond in 60 seconds
- **Crash Recovery**: Optionally save game state to server for resume
- **Validation**: Check that received cards are actually legal moves

### 8.4 Testing Strategy
- **Unit Tests**: Test NetworkController in isolation with mock WebSocket
- **Integration Tests**: Test host-guest communication with two Game instances
- **E2E Tests**: Use Playwright to automate 2-player game flow
- **Load Testing**: Simulate 10+ concurrent games on server

---

## Part 9: Alternative Architectures Considered

### Option A: All Clients Run Game Loop (REJECTED)
- Each client runs their own `runGame()` loop
- Controllers communicate decisions via network
- **Problem**: Hard to keep state in sync; divergence likely

### Option B: Server Runs Game Loop (REJECTED)
- Move game logic to Node.js server
- Clients are thin display layers
- **Problem**: Requires porting all game code to server; loses browser features

### Option C: Host Authority (SELECTED ✅)
- One client (host) runs the authoritative game loop
- Other clients display state and send input
- **Advantages**:
  - Minimal code changes
  - Browser-native features work (DOM, CSS)
  - No trust needed between clients

---

## Part 10: Future Enhancements

### 10.1 Matchmaking
- Automatic pairing of players
- Ranked/unranked modes
- ELO rating system

### 10.2 Spectator Mode
- Allow non-players to watch games
- Stream to Twitch with overlays

### 10.3 Replay System
- Record game state snapshots
- Playback games with timeline scrubbing
- Share replays via URL

### 10.4 Mobile Support
- Responsive design for phone screens
- Touch-friendly card interactions
- Progressive Web App (PWA)

### 10.5 Advanced Server Features
- Persistent game state (resume after disconnect)
- Chat system for players
- Tournament brackets
- Leaderboards

---

## Conclusion

This plan preserves the **elegant async game loop architecture** while adding robust network multiplayer support. The key insight is that the existing `Controller` abstraction already provides perfect extension points—we just need to:

1. Add a `NetworkController` that waits for network messages instead of DOM events
2. Have the host broadcast state updates after each action
3. Have guests render state and send input back to the host

**The game loop doesn't change.** The same `await seat.controller.selectCard()` line works for local, AI, and network players. This is the power of good abstraction!

**Estimated Timeline**: 5 weeks for a polished 2-4 player network experience.

**Next Steps**: Start with Phase 1 (Core Network Controller) and validate the architecture with a working prototype.
