import type { ClientMessage, ServerMessage, Player } from "../shared/protocol.js";

// Client state
let ws: WebSocket | null = null;
let currentRoomCode: string | null = null;
let currentPlayerId: string | null = null;
let players: Player[] = [];

// DOM elements - will be initialized after DOM loads
let lobbyScreen: HTMLElement;
let gameScreen: HTMLElement;
let lobbyMenu: HTMLElement;
let roomLobby: HTMLElement;
let lobbyError: HTMLElement;

let playerNameInput: HTMLInputElement;
let roomCodeInput: HTMLInputElement;
let createRoomBtn: HTMLButtonElement;
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

    case "room_created":
      currentRoomCode = message.roomCode;
      currentPlayerId = message.playerId;
      showRoomLobby();
      break;

    case "room_joined":
      currentRoomCode = message.roomCode;
      currentPlayerId = message.playerId;
      players = message.players;
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
  createRoomBtn = document.getElementById("createRoomBtn") as HTMLButtonElement;
  joinRoomBtn = document.getElementById("joinRoomBtn") as HTMLButtonElement;
  leaveRoomBtn = document.getElementById("leaveRoomBtn") as HTMLButtonElement;
  startGameBtn = document.getElementById("startGameBtn") as HTMLButtonElement;

  roomCodeDisplay = document.getElementById("roomCodeDisplay")!;
  playerCount = document.getElementById("playerCount")!;
  playersList = document.getElementById("playersList")!;

  // Event Handlers
  createRoomBtn.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
      showError("Please enter your name");
      return;
    }

    showError("");
    sendMessage({
      type: "create_room",
      playerName,
    });
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
    // TODO: Implement game start logic
    showError("Game start not yet implemented");
  });

  // Auto-uppercase room code input
  roomCodeInput.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    target.value = target.value.toUpperCase();
  });

  // Allow Enter key to submit
  playerNameInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      if (roomCodeInput.value.trim()) {
        joinRoomBtn.click();
      } else {
        createRoomBtn.click();
      }
    }
  });

  roomCodeInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      joinRoomBtn.click();
    }
  });

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
