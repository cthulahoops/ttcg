import type { ClientMessage, ServerMessage, Player } from "../shared/protocol";
import type {
  SerializedGame,
  SerializedPlayerHand,
  SerializedPyramidHand,
  SerializedSolitaireHand,
} from "../shared/serialized";
import type { Card } from "../shared/types";
import { addToGameLog, updateGameDisplay, createCardElement } from "./display";

// Client state
let ws: WebSocket | null = null;
let currentRoomCode: string | null = null;
let currentPlayerId: string | null = null;
let players: Player[] = [];

// Generate a UUID v4 (fallback for environments without crypto.randomUUID)
function generateUUID(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback implementation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Get or create persistent player ID
function getOrCreatePlayerId(): string {
  let playerId = localStorage.getItem("playerId");
  if (!playerId) {
    playerId = generateUUID();
    localStorage.setItem("playerId", playerId);
  }
  return playerId;
}

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

let gameStatus: SerializedGame | null = null;

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
      // Remove player from list by name
      players = players.filter((p) => p.name !== message.playerName);
      updatePlayersList();
      break;

    case "game_state":
      // Switch to game screen if not already there
      if (lobbyScreen.style.display !== "none") {
        lobbyScreen.style.display = "none";
        gameScreen.style.display = "block";
      }
      gameStatus = message.state
      updateGameDisplay(gameStatus, makeCardElementCallback());
      break;

    case "game_log":
      addToGameLog(message.line, message.important);
      break;

    case "decision_request":
      handleDecisionRequest(message.requestId, message.decision);
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

// Handle decision requests from server
function handleDecisionRequest(requestId: string, decision: any) {
  switch (decision.type) {
    case "choose_button":
      showChooseButtonDialog(requestId, decision.options);
      break;
    case "choose_card":
      showChooseCardDialog(requestId, decision.options);
      break;
    case "select_card":
      enableCardSelection(requestId, decision.availableCards);
      break;
  }
}

// Send decision response back to server
function sendDecisionResponse(requestId: string, response: any) {
  sendMessage({
    type: "decision_response",
    requestId,
    response,
  });
}

// Show button choice dialog
function showChooseButtonDialog(requestId: string, options: any) {
  const dialogArea = document.getElementById("dialogArea")!;
  const dialogTitle = document.getElementById("dialogTitle")!;
  const dialogMessage = document.getElementById("dialogMessage")!;
  const dialogChoices = document.getElementById("dialogChoices")!;
  const dialogInfo = document.getElementById("dialogInfo")!;

  dialogTitle.textContent = options.title || "";
  dialogMessage.textContent = options.message || "";
  dialogInfo.textContent = options.info || "";

  dialogChoices.innerHTML = "";
  options.buttons.forEach((button: any) => {
    const buttonElement = document.createElement("button");
    buttonElement.textContent = button.label;
    buttonElement.disabled = button.disabled || false;

    buttonElement.onclick = () => {
      hideDialog();
      sendDecisionResponse(requestId, button.value);
    };
    dialogChoices.appendChild(buttonElement);
  });

  dialogArea.style.display = "block";
}

// Show card choice dialog
function showChooseCardDialog(requestId: string, options: any) {
  const dialogArea = document.getElementById("dialogArea")!;
  const dialogTitle = document.getElementById("dialogTitle")!;
  const dialogMessage = document.getElementById("dialogMessage")!;
  const dialogChoices = document.getElementById("dialogChoices")!;
  const dialogInfo = document.getElementById("dialogInfo")!;

  dialogTitle.textContent = options.title || "";
  dialogMessage.textContent = options.message || "";
  dialogInfo.textContent = options.info || "";

  dialogChoices.innerHTML = "";
  options.cards.forEach((card: Card) => {
    const cardElement = createCardElement(card, true);
    cardElement.onclick = () => {
      hideDialog();
      sendDecisionResponse(requestId, card);
    };
    dialogChoices.appendChild(cardElement);
  });

  dialogArea.style.display = "block";
}

// Enable card selection from player's hand
function enableCardSelection(requestId: string, availableCards: Card[]) {
  // This will be handled by making cards in the hand clickable
  // For now, we'll store the requestId and available cards globally
  // and handle clicks on cards in the hand
  currentCardSelectionRequest = {
    requestId,
    availableCards,
  };

  if (!gameStatus) {
      return;
  }

  const currentGameStatus = gameStatus;

  // Handle card click during selection
  function handleCardClick(card: Card) {
    if (currentCardSelectionRequest) {
        const requestId = currentCardSelectionRequest.requestId;
        currentCardSelectionRequest = null;
        sendDecisionResponse(requestId, card);
        // Update display to remove clickable state
        updateGameDisplay(currentGameStatus, makeCardElementCallback());
      }
    }

  // Update the display to make available cards clickable
  updateGameDisplay(currentGameStatus, makeCardElementCallback(availableCards, handleCardClick));
}

// Hide dialog
function hideDialog(): void {
  document.getElementById("dialogArea")!.style.display = "none";
}

// Card selection state
let currentCardSelectionRequest: {
  requestId: string;
  availableCards: Card[];
} | null = null;

// Helper to create card element callback
function makeCardElementCallback(
  availableCards: Card[] = [],
  onCardClick?: (card: Card) => void
): (card: Card | "hidden") => HTMLDivElement {
  return (card: Card | "hidden") => {
    if (card === "hidden") {
      // Create card back
      const cardBack = document.createElement("div");
      cardBack.className = "card hidden";
      const valueDiv = document.createElement("div");
      valueDiv.className = "value";
      valueDiv.textContent = "?";
      cardBack.appendChild(valueDiv);
      return cardBack;
    }

    // Check if card is selectable
    const isSelectable = !!onCardClick && availableCards.some(
      (c) => c.suit === card.suit && c.value === card.value
    );

    return createCardElement(
      card,
      isSelectable,
      isSelectable ? () => onCardClick(card) : null
    );
  };
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

// Initialize everything after DOM loads
function initialize() {
  // Get DOM elements
  lobbyScreen = document.getElementById("lobbyScreen")!;
  gameScreen = document.getElementById("gameScreen")!;
  lobbyMenu = document.getElementById("lobbyMenu")!;
  roomLobby = document.getElementById("roomLobby")!;
  lobbyError = document.getElementById("lobbyError")!;

  playerNameInput = document.getElementById(
    "playerNameInput",
  ) as HTMLInputElement;
  roomCodeInput = document.getElementById("roomCodeInput") as HTMLInputElement;
  generateCodeBtn = document.getElementById(
    "generateCodeBtn",
  ) as HTMLButtonElement;
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
      playerId: getOrCreatePlayerId(),
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
