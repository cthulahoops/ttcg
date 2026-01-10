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

## Part 1: Core Architecture

### 1.1 Network Controller

Create a new `NetworkController` class that implements the same `Controller` interface:

```typescript
// network.ts
export class NetworkController extends Controller {
  private ws: WebSocket;
  private seatIndex: number;

  constructor(ws: WebSocket, seatIndex: number) {
    super();
    this.ws = ws;
    this.seatIndex = seatIndex;
  }

  // Wait for remote player to choose a button
  async chooseButton<T>(options: ChoiceButtonOptions<T>): Promise<T> {
    return new Promise((resolve) => {
      const requestId = generateId();

      // Send choice request to remote player
      this.ws.send(JSON.stringify({
        type: 'CHOOSE_BUTTON_REQUEST',
        requestId,
        seatIndex: this.seatIndex,
        options: {
          title: options.title,
          message: options.message,
          buttons: options.buttons.map(b => ({ label: b.label, valueId: b.value })),
          info: options.info
        }
      }));

      // Register handler for response
      this.registerResponseHandler(requestId, resolve);
    });
  }

  // Wait for remote player to choose a card
  async chooseCard<T>(options: ChoiceCardOptions<T>): Promise<T> {
    return new Promise((resolve) => {
      const requestId = generateId();

      this.ws.send(JSON.stringify({
        type: 'CHOOSE_CARD_REQUEST',
        requestId,
        seatIndex: this.seatIndex,
        options: {
          title: options.title,
          message: options.message,
          cards: options.cards,  // Serialized cards
          info: options.info
        }
      }));

      this.registerResponseHandler(requestId, resolve);
    });
  }

  // Wait for remote player to select a card from their hand
  async selectCard(availableCards: Card[], renderCards: () => void): Promise<Card> {
    return new Promise((resolve) => {
      const requestId = generateId();

      // Don't call renderCards - remote player has their own display

      this.ws.send(JSON.stringify({
        type: 'SELECT_CARD_REQUEST',
        requestId,
        seatIndex: this.seatIndex,
        availableCards: availableCards
      }));

      this.registerResponseHandler(requestId, resolve);
    });
  }

  private registerResponseHandler(requestId: string, resolve: (value: any) => void): void {
    // Store resolver in map, keyed by requestId
    // When response message arrives, call resolve() and remove from map
  }
}
```

**Key Insight**: The `NetworkController` has the **exact same interface** as `HumanController` and `AIController`. The game loop doesn't know or care whether it's waiting for:
- A DOM click event (HumanController)
- A random AI delay (AIController)
- A network message (NetworkController)

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

## Part 3: Server Implementation

### 3.1 Game Server (Node.js + WebSocket)

Create a simple Node.js server that hosts game rooms:

```typescript
// server/gameServer.ts
import { WebSocketServer, WebSocket } from 'ws';

interface GameRoom {
  roomCode: string;
  hostSocket: WebSocket | null;
  guestSockets: Map<number, WebSocket>;  // seatIndex → socket
  playerCount: number;
  started: boolean;
}

const rooms = new Map<string, GameRoom>();

const wss = new WebSocketServer({ port: 8080 });

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (data: string) => {
    const message = JSON.parse(data);

    switch (message.type) {
      case 'CREATE_GAME':
        handleCreateGame(ws, message);
        break;

      case 'JOIN_GAME':
        handleJoinGame(ws, message);
        break;

      case 'INPUT_RESPONSE':
        // Guest sent input → forward to host
        handleInputResponse(ws, message);
        break;

      case 'CHOOSE_BUTTON_REQUEST':
      case 'CHOOSE_CARD_REQUEST':
      case 'SELECT_CARD_REQUEST':
        // Host requests input from guest → forward to specific guest
        handleInputRequest(ws, message);
        break;

      case 'STATE_UPDATE':
        // Host sent state update → broadcast to all guests
        handleStateUpdate(ws, message);
        break;
    }
  });
});

function handleCreateGame(ws: WebSocket, message: any): void {
  const roomCode = generateRoomCode();

  rooms.set(roomCode, {
    roomCode,
    hostSocket: ws,
    guestSockets: new Map(),
    playerCount: message.playerCount,
    started: false
  });

  ws.send(JSON.stringify({
    type: 'GAME_CREATED',
    roomCode
  }));
}

function handleJoinGame(ws: WebSocket, message: any): void {
  const room = rooms.get(message.roomCode);

  if (!room) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found' }));
    return;
  }

  if (room.guestSockets.size >= room.playerCount - 1) {
    ws.send(JSON.stringify({ type: 'ERROR', message: 'Room full' }));
    return;
  }

  // Assign next available seat
  const seatIndex = room.guestSockets.size + 1;
  room.guestSockets.set(seatIndex, ws);

  ws.send(JSON.stringify({
    type: 'SEAT_ASSIGNMENT',
    seatIndex,
    roomCode: room.roomCode
  }));

  // Notify host that a player joined
  room.hostSocket?.send(JSON.stringify({
    type: 'PLAYER_JOINED',
    seatIndex,
    totalPlayers: room.guestSockets.size + 1
  }));

  // If room is full, start the game
  if (room.guestSockets.size === room.playerCount - 1) {
    room.started = true;
    room.hostSocket?.send(JSON.stringify({ type: 'START_GAME' }));
  }
}

function handleInputRequest(hostWs: WebSocket, message: any): void {
  // Find the room where this host belongs
  const room = findRoomByHost(hostWs);
  if (!room) return;

  // Forward request to the specific guest
  const guestSocket = room.guestSockets.get(message.seatIndex);
  if (guestSocket) {
    guestSocket.send(JSON.stringify(message));
  }
}

function handleInputResponse(guestWs: WebSocket, message: any): void {
  // Find the room where this guest belongs
  const room = findRoomByGuest(guestWs);
  if (!room) return;

  // Forward response back to host
  room.hostSocket?.send(JSON.stringify(message));
}

function handleStateUpdate(hostWs: WebSocket, message: any): void {
  const room = findRoomByHost(hostWs);
  if (!room) return;

  // Broadcast to all guests
  room.guestSockets.forEach((guestSocket) => {
    guestSocket.send(JSON.stringify(message));
  });
}
```

**Key Design**:
- **Minimal Server Logic**: The server is a dumb relay—it just forwards messages between host and guests
- **Host Authority**: All game logic runs on the host's browser; server doesn't validate moves
- **Simple Room System**: Room codes (e.g., "ABCD") identify game sessions

### 3.2 Deployment Options

**Option A: Peer-to-Peer (WebRTC)**
- No server needed (after initial signaling)
- Lower latency
- More complex to implement
- Works for 2-player games

**Option B: Centralized Server (Recommended)**
- Simple to implement
- Works for 2-4 players
- Can run on free tier (Render, Railway, Fly.io)
- ~100ms latency acceptable for turn-based game

**Option C: Local Network (No Internet)**
- Host runs a local WebSocket server
- Players connect via LAN IP address
- Great for offline play
- No deployment needed

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
