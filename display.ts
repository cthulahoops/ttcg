// Type-only imports (no runtime circular dependency)
import type { Game } from "./game.js";

import type { AnyCard, Card } from "./types.js";
import type { Seat } from "./seat.js";
import type { HumanController } from "./controllers.js";

export function displayTrick(gameState: Game): void {
  const trickDiv = document.getElementById("trickCards")!;
  trickDiv.innerHTML = "";

  gameState.currentTrick.forEach((play) => {
    const trickCardDiv = document.createElement("div");
    trickCardDiv.className = "trick-card";

    const labelDiv = document.createElement("div");
    labelDiv.className = "player-label";
    labelDiv.textContent =
      getPlayerDisplayName(gameState, play.playerIndex) +
      (play.isTrump ? " (TRUMP)" : "");

    trickCardDiv.appendChild(createCardElement(play.card));
    trickCardDiv.appendChild(labelDiv);
    trickDiv.appendChild(trickCardDiv);
  });
}

export function highlightActivePlayer(activePlayer: number): void {
  document.querySelectorAll(".player").forEach((div) => {
    if ((div as HTMLElement).dataset.player === String(activePlayer + 1)) {
      div.classList.add("active");
    } else {
      div.classList.remove("active");
    }
  });
}

export function displayHands(
  gameState: Game,
  seats: Seat[],
  isLegalMove: (gameState: Game, playerIndex: number, card: Card) => boolean,
  activePlayer?: number,
): void {
  highlightActivePlayer(gameState.currentPlayer);

  for (const seat of seats) {
    const canSelectCard =
      activePlayer !== undefined && seat.seatIndex === activePlayer;

    seat.hand!.render(
      document.getElementById(`player${seat.seatIndex + 1}`)!,
      (card) => canSelectCard && isLegalMove(gameState, seat.seatIndex, card),
      (card) => {
        if (canSelectCard) {
          (seat.controller as HumanController).resolveCardSelection!(card);
        }
      },
    );
  }
}

export function updateGameStatus(
  gameState: Game,
  message: string | null = null,
): void {
  const statusDiv = document.getElementById("gameStatus")!;

  if (message) {
    statusDiv.textContent = message;
  } else if (gameState.currentPlayer === 0) {
    statusDiv.textContent = "Your turn! Click a card to play.";
  } else {
    statusDiv.textContent = `${getPlayerDisplayName(gameState, gameState.currentPlayer)}'s turn...`;
  }
}


export function getPlayerDisplayName(gameState: Game, playerIndex: number): string {
  return gameState.seats[playerIndex].getDisplayName();
}


export function addToGameLog(message: string, important: boolean = false): void {
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


export function updateTricksDisplay(gameState: Game): void {
  for (const seat of gameState.seats) {
    const trickCount = seat.getTrickCount();

    document.getElementById(`tricks${seat.seatIndex + 1}`)!.textContent =
      `Tricks: ${trickCount}`;

    const statusDiv = document.getElementById(
      `objectiveStatus${seat.seatIndex + 1}`,
    )!;

    const characterDef = seat.characterDef;
    if (!characterDef) {
      statusDiv.innerHTML = "";
      continue;
    }

    statusDiv.innerHTML = characterDef.display.renderStatus(gameState, seat);

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



export function updatePlayerHeadings(gameState: Game): void {
  for (const seat of gameState.seats) {
    const nameElement = document.getElementById(
      `playerName${seat.seatIndex + 1}`,
    )!;
    const objectiveElement = document.getElementById(
      `objective${seat.seatIndex + 1}`,
    )!;
    const character = seat.character;

    if (character) {
      nameElement.textContent = seat.getDisplayName();
    }

    if (seat.characterDef) {
      let objective: string;
      if (seat.characterDef.objective?.getText) {
        objective = seat.characterDef.objective.getText(gameState);
      } else {
        objective = seat.characterDef.objective.text!;
      }

      objectiveElement.textContent = `Goal: ${objective}`;
    }
  }
}


export function createCardElement(
  card: AnyCard,
  clickable = false,
  clickHandler: (() => void) | null = null,
): HTMLDivElement {
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


export function updateLostCardDisplay(gameState: Game): void {
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
