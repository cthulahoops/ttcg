import type { ClientMessage, ServerMessage, Player } from "../shared/protocol.js";
import type { SerializedGame } from "../shared/serialized.js";

// Client state
let ws: WebSocket | null = null;
let currentRoomCode: string | null = null;
let currentPlayerId: string | null = null;
let players: Player[] = [];
let gameState: SerializedGame | null = null;

// DOM elements - will be initialized after DOM loads
let lobbyScreen: HTMLElement;
let gameScreen: HTMLElement;
let lobbyMenu: HTMLElement;
let roomLobby: HTMLElement;
let lobbyError: HTMLElement;

let playerNameInput: HTMLInputElement;
let roomCodeInput: HTMLInputElement;
let generateCodeBtn: HTMLButtonElement;
let joinRoomBtn: HTMLButtonElement;
let leaveRoomBtn: HTMLButtonElement;
let startGameBtn: HTMLButtonElement;

let roomCodeDisplay: HTMLElement;
let playerCount: HTMLElement;
let playersList: HTMLElement;

// Initialize WebSocket connection
function connectWebSocket() {
  // Connect to WebSocket server on port 3000
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  const wsUrl = `${protocol}//${host}:3000`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("WebSocket connected");
    showError("");
  };

  ws.onmessage = (event) => {
    const message: ServerMessage = JSON.parse(event.data);
    handleServerMessage(message);
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
    showError("Connection error. Please refresh the page.");
  };

  ws.onclose = () => {
    console.log("WebSocket closed");
    showError("Connection lost. Please refresh the page.");
  };
}

// Handle server messages
function handleServerMessage(message: ServerMessage) {
  console.log("Received:", message);

  switch (message.type) {
    case "pong":
      // Heartbeat response
      break;

    case "room_joined":
      currentRoomCode = message.roomCode;
      currentPlayerId = message.playerId;
      players = message.players;
      // Update URL fragment with room code
      window.location.hash = message.roomCode;
      showRoomLobby();
      updatePlayersList();
      break;

    case "player_joined":
      // Add new player to list
      players.push(message.player);
      updatePlayersList();
      break;

    case "player_left":
      // Remove player from list
      players = players.filter((p) => p.playerId !== message.playerId);
      updatePlayersList();
      break;

    case "game_started":
      // Switch to game screen
      lobbyScreen.style.display = "none";
      gameScreen.style.display = "block";
      break;

    case "game_state":
      gameState = message.state;
      updateGameDisplay();
      break;

    case "error":
      showError(message.message);
      break;
  }
}

// Send message to server
function sendMessage(message: ClientMessage) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    console.log("Sent:", message);
  } else {
    showError("Not connected to server");
  }
}

// UI Functions
function showError(message: string) {
  lobbyError.textContent = message;
}

function showRoomLobby() {
  lobbyMenu.style.display = "none";
  roomLobby.style.display = "block";
  roomCodeDisplay.textContent = currentRoomCode || "";
}

function showLobbyMenu() {
  lobbyMenu.style.display = "block";
  roomLobby.style.display = "none";
  currentRoomCode = null;
  currentPlayerId = null;
  players = [];
  // Clear URL fragment when leaving room
  window.location.hash = "";
  showError("");
}

function updatePlayersList() {
  playersList.innerHTML = "";
  playerCount.textContent = players.length.toString();

  players.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = player.name;
    if (!player.connected) {
      li.classList.add("disconnected");
    }
    playersList.appendChild(li);
  });

  // Enable start button if we have at least 2 players
  startGameBtn.disabled = players.length < 2;
}

// Update the game display with current game state
function updateGameDisplay() {
  if (!gameState) return;

  // Update current trick display
  updateTrickDisplay();

  // Update player info (hands, tricks won, etc.)
  updatePlayersDisplay();

  // Update game status
  updateStatusDisplay();

  // Update lost card
  updateLostCardDisplay();
}

function updateTrickDisplay() {
  if (!gameState) return;

  const trickDiv = document.getElementById("trickCards");
  if (!trickDiv) return;

  trickDiv.innerHTML = "";

  const state = gameState; // Local const for null-safety
  state.currentTrick.forEach((play) => {
    const trickCardDiv = document.createElement("div");
    trickCardDiv.className = "trick-card";

    const seat = state.seats[play.seatIndex];
    const labelDiv = document.createElement("div");
    labelDiv.className = "player-label";
    labelDiv.textContent = seat.character || `Player ${play.seatIndex + 1}`;
    if (play.isTrump) {
      labelDiv.textContent += " (TRUMP)";
    }

    trickCardDiv.appendChild(createCardElement(play.card));
    trickCardDiv.appendChild(labelDiv);
    trickDiv.appendChild(trickCardDiv);
  });
}

function updatePlayersDisplay() {
  if (!gameState) return;

  const state = gameState; // Local const for null-safety
  state.seats.forEach((seat, index) => {
    const playerNum = index + 1;

    // Update player name
    const nameElement = document.getElementById(`playerName${playerNum}`);
    if (nameElement) {
      nameElement.textContent = seat.character || `Player ${playerNum}`;
    }

    // Update tricks count
    const tricksElement = document.getElementById(`tricks${playerNum}`);
    if (tricksElement) {
      tricksElement.textContent = `Tricks: ${seat.tricksWon.length}`;
    }

    // Update hand display
    const handElement = document.getElementById(`player${playerNum}Hand`);
    if (handElement) {
      handElement.innerHTML = "";

      if (seat.visibleCards) {
        // Show actual cards if visible
        seat.visibleCards.forEach((card) => {
          handElement.appendChild(createCardElement(card, false));
        });
      } else {
        // Show card backs for hidden cards
        for (let i = 0; i < seat.handSize; i++) {
          const cardBack = document.createElement("div");
          cardBack.className = "card card-back";
          handElement.appendChild(cardBack);
        }
      }
    }

    // Highlight active player
    const playerDiv = document.querySelector(`[data-player="${playerNum}"]`);
    if (playerDiv) {
      if (index === state.currentPlayer) {
        playerDiv.classList.add("active");
      } else {
        playerDiv.classList.remove("active");
      }
    }
  });
}

function updateStatusDisplay() {
  if (!gameState) return;

  const statusDiv = document.getElementById("gameStatus");
  if (!statusDiv) return;

  const currentSeat = gameState.seats[gameState.currentPlayer];
  const playerName = currentSeat.character || `Player ${gameState.currentPlayer + 1}`;

  statusDiv.textContent = `${playerName}'s turn`;
}

function updateLostCardDisplay() {
  if (!gameState) return;

  const lostCardDiv = document.getElementById("lostCard");
  if (!lostCardDiv) return;

  lostCardDiv.innerHTML = "";

  if (gameState.lostCard) {
    lostCardDiv.appendChild(createCardElement(gameState.lostCard));
  }
}

function createCardElement(card: { suit: string; value: number }, clickable = false): HTMLDivElement {
  const cardDiv = document.createElement("div");
  cardDiv.className = `card ${card.suit}`;
  if (clickable) {
    cardDiv.classList.add("clickable");
  }

  const valueDiv = document.createElement("div");
  valueDiv.className = "value";
  valueDiv.textContent = card.value.toString();

  const suitDiv = document.createElement("div");
  suitDiv.className = "suit";
  suitDiv.textContent = card.suit;

  cardDiv.appendChild(valueDiv);
  cardDiv.appendChild(suitDiv);

  return cardDiv;
}

// Initialize everything after DOM loads
function initialize() {
  // Get DOM elements
  lobbyScreen = document.getElementById("lobbyScreen")!;
  gameScreen = document.getElementById("gameScreen")!;
  lobbyMenu = document.getElementById("lobbyMenu")!;
  roomLobby = document.getElementById("roomLobby")!;
  lobbyError = document.getElementById("lobbyError")!;

  playerNameInput = document.getElementById("playerNameInput") as HTMLInputElement;
  roomCodeInput = document.getElementById("roomCodeInput") as HTMLInputElement;
  generateCodeBtn = document.getElementById("generateCodeBtn") as HTMLButtonElement;
  joinRoomBtn = document.getElementById("joinRoomBtn") as HTMLButtonElement;
  leaveRoomBtn = document.getElementById("leaveRoomBtn") as HTMLButtonElement;
  startGameBtn = document.getElementById("startGameBtn") as HTMLButtonElement;

  roomCodeDisplay = document.getElementById("roomCodeDisplay")!;
  playerCount = document.getElementById("playerCount")!;
  playersList = document.getElementById("playersList")!;

  // Event Handlers
  generateCodeBtn.addEventListener("click", () => {
    // Generate a random 4-character room code (A-Z excluding I and O)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    roomCodeInput.value = code;
  });

  joinRoomBtn.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    const roomCode = roomCodeInput.value.trim().toUpperCase();

    if (!playerName) {
      showError("Please enter your name");
      return;
    }

    if (!roomCode || roomCode.length !== 4) {
      showError("Please enter a valid 4-character room code");
      return;
    }

    showError("");
    sendMessage({
      type: "join_room",
      roomCode,
      playerName,
    });
  });

  leaveRoomBtn.addEventListener("click", () => {
    sendMessage({ type: "leave_room" });
    showLobbyMenu();
  });

  startGameBtn.addEventListener("click", () => {
    sendMessage({ type: "start_game" });
  });

  // Auto-uppercase room code input
  roomCodeInput.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    target.value = target.value.toUpperCase();
  });

  // Allow Enter key to submit
  playerNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      joinRoomBtn.click();
    }
  });

  roomCodeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      joinRoomBtn.click();
    }
  });

  // Check for room code in URL fragment
  const urlFragment = window.location.hash.slice(1); // Remove the '#'
  if (urlFragment && urlFragment.length === 4) {
    roomCodeInput.value = urlFragment.toUpperCase();
  }

  // Connect WebSocket
  connectWebSocket();

  // Heartbeat to keep connection alive
  setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      sendMessage({ type: "ping" });
    }
  }, 30000); // Every 30 seconds
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
