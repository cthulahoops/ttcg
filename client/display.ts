import type { AnyCard, Card } from "@shared/types";
import type {
  SerializedGame,
  SerializedSeat,
  SerializedPlayerHand,
  SerializedSolitaireHand,
  SerializedPyramidHand,
} from "@shared/serialized";

export function updateGameDisplay(
  game: SerializedGame,
  cardElement: (card: Card | "hidden") => HTMLDivElement,
) {
  displayTrick(game);
  updatePlayersDisplay(game, cardElement);
  updateStatusDisplay(game);
  updateLostCardDisplay(game);
}

function displayTrick(gameState: SerializedGame): void {
  const trickDiv = document.getElementById("trickCards")!;
  trickDiv.innerHTML = "";

  gameState.currentTrick.forEach((play) => {
    const trickCardDiv = document.createElement("div");
    trickCardDiv.className = "trick-card";

    const labelDiv = document.createElement("div");
    labelDiv.className = "player-label";
    const seat = gameState.seats[play.seatIndex];
    labelDiv.textContent =
      (seat.character || `Player ${play.seatIndex + 1}`) +
      (play.isTrump ? " (TRUMP)" : "");

    trickCardDiv.appendChild(createCardElement(play.card));
    trickCardDiv.appendChild(labelDiv);
    trickDiv.appendChild(trickCardDiv);
  });
}

function highlightActivePlayer(activePlayer: number): void {
  document.querySelectorAll(".player").forEach((div) => {
    if ((div as HTMLElement).dataset.player === String(activePlayer + 1)) {
      div.classList.add("active");
    } else {
      div.classList.remove("active");
    }
  });
}

function displayHands(gameState: SerializedGame): void {
  highlightActivePlayer(gameState.currentPlayer);

  // Hand rendering handled elsewhere
}

function updateGameStatus(
  gameState: SerializedGame,
  message: string | null = null,
): void {
  const statusDiv = document.getElementById("gameStatus")!;

  if (message) {
    statusDiv.textContent = message;
  } else if (gameState.currentPlayer === 0) {
    statusDiv.textContent = "Your turn! Click a card to play.";
  } else {
    const seat = gameState.seats[gameState.currentPlayer];
    statusDiv.textContent = `${seat.character || `Player ${gameState.currentPlayer + 1}`}'s turn...`;
  }
}

export function addToGameLog(
  message: string,
  important: boolean = false,
): void {
  const logDiv = document.getElementById("gameLog")!;
  const entry = document.createElement("div");
  entry.className = "log-entry" + (important ? " important" : "");
  entry.textContent = message;
  logDiv.appendChild(entry);

  // Auto-scroll to bottom
  logDiv.scrollTop = logDiv.scrollHeight;
}

export function clearGameLog(): void {
  document.getElementById("gameLog")!.innerHTML = "";
}

export function updateTricksDisplay(gameState: SerializedGame): void {
  for (const seat of gameState.seats) {
    const trickCount = seat.tricksWon.length;

    document.getElementById(`tricks${seat.seatIndex + 1}`)!.textContent =
      `Tricks: ${trickCount}`;

    const statusDiv = document.getElementById(
      `objectiveStatus${seat.seatIndex + 1}`,
    )!;

    const status = seat.status;
    if (status) {
      const icon = status.met
        ? '<span class="success">✓</span>'
        : status.completable
          ? '<span class="fail">✗</span>'
          : '<span class="fail">✗ (impossible)</span>';
      statusDiv.innerHTML = status.details ? `${icon} ${status.details}` : icon;
    }

    const threatCardDiv = document.getElementById(
      `threatCard${seat.seatIndex + 1}`,
    )!;
    threatCardDiv.innerHTML = "";

    if (seat.threatCard !== null) {
      threatCardDiv.appendChild(
        createCardElement({ suit: "threat", value: seat.threatCard }),
      );
    }
  }
}

function updatePlayerHeadings(gameState: SerializedGame): void {
  for (const seat of gameState.seats) {
    const nameElement = document.getElementById(
      `playerName${seat.seatIndex + 1}`,
    )!;
    const objectiveElement = document.getElementById(
      `objective${seat.seatIndex + 1}`,
    )!;
    const character = seat.character;

    if (character) {
      nameElement.textContent = character;
    }

    if (seat.objective) {
      objectiveElement.textContent = `Goal: ${seat.objective}`;
    }
  }
}

export function createCardElement(
  card: AnyCard | "hidden",
  clickable = false,
  clickHandler: (() => void) | null = null,
): HTMLDivElement {
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

  const cardDiv = document.createElement("div");
  cardDiv.className = `card ${card.suit}`;
  if (clickable) {
    cardDiv.classList.add("clickable");
    if (clickHandler) {
      cardDiv.onclick = clickHandler;
    }
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

export function updateLostCardDisplay(gameState: SerializedGame): void {
  const lostCardDiv = document.getElementById("lostCard")!;
  lostCardDiv.innerHTML = "";

  if (gameState.lostCard) {
    lostCardDiv.appendChild(createCardElement(gameState.lostCard));
  }
}

export function resetPlayerHeadings(): void {
  for (let p = 0; p < 4; p++) {
    const nameElement = document.getElementById(`playerName${p + 1}`)!;
    const objectiveElement = document.getElementById(`objective${p + 1}`)!;
    nameElement.textContent = `Player ${p + 1}`;
    objectiveElement.textContent = "";
  }
}

export function copyGameLog(): void {
  const logDiv = document.getElementById("gameLog")!;
  const logEntries = Array.from(logDiv.querySelectorAll(".log-entry"));
  const logText = logEntries.map((entry) => entry.textContent).join("\n");

  navigator.clipboard.writeText(logText).then(
    () => {
      const button = document.querySelector(
        ".copy-log-button",
      ) as HTMLButtonElement;
      const originalText = button.textContent;
      button.textContent = "Copied!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 1500);
    },
    (err) => {
      console.error("Failed to copy log:", err);
    },
  );
}

function updateStatusDisplay(gameState: SerializedGame) {
  const statusDiv = document.getElementById("gameStatus");
  if (!statusDiv) return;

  const currentSeat = gameState.seats[gameState.currentPlayer];
  const playerName =
    currentSeat.character || `Player ${gameState.currentPlayer + 1}`;

  statusDiv.textContent = `${playerName}'s turn`;
}

function updatePlayersDisplay(
  game: SerializedGame,
  cardElement: (card: Card | "hidden") => HTMLDivElement,
) {
  // Update player names and objectives using display.ts functions
  updatePlayerHeadings(game);
  updateTricksDisplay(game);

  // Update hands and active player highlighting
  game.seats.forEach((seat, index) => {
    const playerNum = index + 1;

    // Update hand display
    const handElement = document.getElementById(`player${playerNum}`);
    if (handElement && seat.hand) {
      if (seat.hand.type === "player") {
        renderPlayerHand(seat.hand, handElement, cardElement);
      } else if (seat.hand.type === "solitaire") {
        renderSolitaireHand(seat.hand, handElement, cardElement);
      } else if (seat.hand.type === "pyramid") {
        renderPyramidHand(seat.hand, handElement, cardElement);
      }
    }

    // Highlight active player
    const playerDiv = document.querySelector(`[data-player="${playerNum}"]`);
    if (playerDiv) {
      if (index === game.currentPlayer) {
        playerDiv.classList.add("active");
      } else {
        playerDiv.classList.remove("active");
      }
    }
  });
}

function renderPlayerHand(
  hand: SerializedPlayerHand,
  domElement: HTMLElement,
  cardElement: (card: Card | "hidden") => HTMLDivElement,
): void {
  domElement.innerHTML = "";
  domElement.classList.remove("pyramid-hand", "solitaire-hand");

  hand.cards.forEach((card) => {
    domElement.appendChild(cardElement(card));
  });
}

function renderSolitaireHand(
  hand: SerializedSolitaireHand,
  domElement: HTMLElement,
  cardElement: (card: Card | "hidden") => HTMLDivElement,
): void {
  domElement.innerHTML = "";
  domElement.classList.remove("pyramid-hand");
  domElement.classList.add("solitaire-hand");

  hand.cards.forEach((card) => {
    // domElement.appendChild(cardElement(card));
  });
}

function renderPyramidHand(
  hand: SerializedPyramidHand,
  domElement: HTMLElement,
  cardElement: (card: Card | "hidden") => HTMLDivElement,
): void {
  domElement.innerHTML = "";
  domElement.classList.add("pyramid-hand");

  const rows = [
    { start: 0, count: 3 }, // Top row
    { start: 3, count: 4 }, // Middle row
    { start: 7, count: 5 }, // Bottom row
  ];

  rows.forEach((rowInfo, rowIdx) => {
    for (let colIdx = 0; colIdx < rowInfo.count; colIdx++) {
      const cardIdx = rowInfo.start + colIdx;
      const card = hand.positions[cardIdx];

      if (card === null) continue; // Empty position

      const element = cardElement(card);

      // Position using CSS grid
      element.style.gridRow = `${rowIdx + 1} / span 2`;
      element.style.gridColumn = `${2 * colIdx + (3 - rowIdx)} / span 2`;

      domElement.appendChild(element);
    }
  });

  // Render extra cards
  hand.extraCards.forEach((card, idx) => {
    const element = cardElement(card);
    element.classList.add("pyramid-extra");
    element.style.gridRow = `${3} / span 2`;
    element.style.gridColumn = `${2 * (idx + 5) + 1} / span 2`;

    domElement.appendChild(element);
  });
}
