// Import modules
import {
  Hand as _Hand,
  PlayerHand,
  PyramidHand,
  HiddenHand,
  SolitaireHand,
} from "./hands.js";
import {
  shuffleDeck,
  sortHand,
  createCardElement,
  delay,
} from "./utils.js";
import { Seat } from "./seat.js";
import { HumanController, AIController } from "./controllers.js";
import { characterRegistry, allCharacterNames } from "./characters/registry.js";
import type {
  Card,
  Suit,
  ThreatCard,
  Controller,
  ChoiceButton,
} from "./types";

// All possible characters in the game (except Frodo who is automatically assigned)
const allCharacters = allCharacterNames.filter((name) => name !== "Frodo");

// ===== INTERFACES =====

interface TrickPlay {
  playerIndex: number;
  card: Card;
  isTrump: boolean;
}

interface GameSetupContext {
  frodoSeat: Seat | null;
  exchangeMade?: boolean;
}

// ===== GAME CLASS =====

export class Game {
  playerCount: number;
  numCharacters: number;
  seats: Seat[];
  currentTrick: TrickPlay[];
  currentPlayer: number;
  currentTrickNumber: number;
  leadSuit: Suit | null;
  ringsBroken: boolean;
  availableCharacters: string[];
  lostCard: Card | null;
  lastTrickWinner: number | null;
  threatDeck: number[];
  tricksToPlay: number;

  constructor(
    playerCount: number,
    numCharacters: number,
    seats: Seat[],
    lostCard: Card | null,
    startPlayer: number,
  ) {
    this.playerCount = playerCount;
    this.numCharacters = numCharacters;
    this.seats = seats;
    this.currentTrick = [];
    this.currentPlayer = startPlayer;
    this.currentTrickNumber = 0;
    this.leadSuit = null;
    this.ringsBroken = false;
    this.availableCharacters = [];
    this.lostCard = lostCard;
    this.lastTrickWinner = null;
    this.threatDeck = [1, 2, 3, 4, 5, 6, 7];
    this.tricksToPlay = numCharacters === 3 ? 12 : 9;

    // Shuffle the threat deck
    this.threatDeck = shuffleDeck(
      this.threatDeck.map((v) => ({ value: v })),
    ).map((c) => c.value);
  }

  get finished(): boolean {
    // Game is finished when (numCharacters - 1) players have no cards
    const playersWithNoCards = this.seats.filter((seat) =>
      seat.hand!.isEmpty(),
    ).length;
    return playersWithNoCards >= this.numCharacters - 1;
  }

  // ===== GAME API METHODS FOR CHARACTER SETUP/OBJECTIVES =====

  // Generic choice method
  async choice(
    seat: Seat,
    question: string,
    options: string[],
  ): Promise<string> {
    return await seat.controller.chooseButton({
      title: question,
      message: question,
      buttons: options.map((opt) => ({ label: opt, value: opt })),
    });
  }

  // Offer lost card (optional take)
  async offerLostCard(seat: Seat): Promise<void> {
    if (!this.lostCard) return;

    const shouldTake = await seat.controller.chooseButton({
      title: `${seat.character} - Lost Card`,
      message: `Take the lost card (${this.lostCard.value} of ${this.lostCard.suit})?`,
      buttons: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
    });

    if (shouldTake) {
      seat.hand!.addCard(this.lostCard);
      addToGameLog(`${seat.getDisplayName()} takes the lost card`);
      displayHands(this, this.seats);
    }
  }

  // Exchange with lost card (swap one card)
  async exchangeWithLostCard(
    seat: Seat,
    _setupContext: GameSetupContext,
  ): Promise<void> {
    if (!this.lostCard) return;

    // Choose card to exchange
    const cards = seat.hand!.getCards
      ? (seat.hand as any).getCards()
      : seat.hand!.getAllCards();
    const sortedCards = sortHand(cards);

    const cardToGive = await seat.controller.chooseCard({
      title: `${seat.character} - Exchange with Lost Card`,
      message: `Choose a card to exchange with the lost card (${this.lostCard.value} of ${this.lostCard.suit})`,
      cards: sortedCards,
    });

    // Swap cards
    seat.hand!.removeCard(cardToGive);
    seat.hand!.addCard(this.lostCard);
    this.lostCard = cardToGive;

    addToGameLog(`${seat.getDisplayName()} exchanges with the lost card`);
    displayHands(this, this.seats);
  }

  // Reveal hand (make visible to all)
  revealHand(seat: Seat): void {
    // This would need to modify the hand to be always visible
    // For now, just log it
    addToGameLog(
      `${seat.getDisplayName()}'s hand is now visible to all players`,
    );
    seat.hand = seat.hand!.revealed();
  }

  // Draw threat card
  async drawThreatCard(
    seat: Seat,
    options: { exclude?: number } = {},
  ): Promise<void> {
    if (this.threatDeck.length === 0) {
      addToGameLog(`${seat.getDisplayName()} - No threat cards remaining!`);
      throw new Error("Threat deck is empty!");
    }

    let threatCard: number;
    const exclude = options.exclude;

    // Keep drawing until we get a valid card
    do {
      if (this.threatDeck.length === 0) {
        addToGameLog(
          `${seat.getDisplayName()} - No valid threat cards remaining!`,
        );
        throw new Error("Threat deck is empty!");
      }
      threatCard = this.threatDeck.shift()!;
    } while (exclude !== undefined && threatCard === exclude);

    seat.threatCard = threatCard;
    addToGameLog(
      `${seat.getDisplayName()} draws threat card: ${threatCard}`,
      true,
    );
    updateGameStatus(
      this,
      `${seat.getDisplayName()} draws threat card ${threatCard}`,
    );
    updateTricksDisplay(this);
  }

  // Choose threat card
  async chooseThreatCard(seat: Seat): Promise<void> {
    if (this.threatDeck.length === 0) {
      addToGameLog(`${seat.getDisplayName()} - No threat cards available!`);
      throw new Error("Threat deck is empty!");
    }

    // Convert threat card numbers to ThreatCard objects
    const threatCards: ThreatCard[] = this.threatDeck.map((value) => ({
      value,
      suit: "threat",
    }));

    const choice = await seat.controller.chooseCard({
      title: `${seat.character} - Choose Threat Card`,
      message: "Choose a threat card:",
      cards: threatCards,
    });

    // Remove chosen card from deck
    const index = this.threatDeck.indexOf(choice.value);
    if (index > -1) {
      this.threatDeck.splice(index, 1);
    }

    seat.threatCard = choice.value;
    addToGameLog(
      `${seat.getDisplayName()} chooses threat card: ${choice.value}`,
      true,
    );
    updateGameStatus(
      this,
      `${seat.getDisplayName()} chooses threat card ${choice.value}`,
    );
    updateTricksDisplay(this);
  }

  // Exchange with another player (predicate-based)
  async exchange(
    seat: Seat,
    setupContext: GameSetupContext,
    canExchangeWith: (character: string) => boolean,
  ): Promise<void> {
    // In 1-player mode, check if exchange already made
    if (this.playerCount === 1 && setupContext.exchangeMade) {
      return;
    }

    // Find valid exchange partners
    const validPlayers: number[] = [];
    for (const otherSeat of this.seats) {
      if (otherSeat.seatIndex !== seat.seatIndex && otherSeat.character) {
        if (canExchangeWith(otherSeat.character)) {
          validPlayers.push(otherSeat.seatIndex);
        }
      }
    }

    if (validPlayers.length === 0) {
      addToGameLog(`${seat.getDisplayName()} has no valid exchange partners`);
      return;
    }

    // In 1-player mode, ask if player wants to exchange
    if (this.playerCount === 1) {
      const targetDescription =
        validPlayers.length === 1
          ? this.seats[validPlayers[0]].character!
          : validPlayers.map((p) => this.seats[p].character).join(" or ");

      const wantsToExchange = await seat.controller.chooseButton({
        title: `${seat.character} - Exchange?`,
        message: `Do you want ${seat.character} to exchange with ${targetDescription}?`,
        buttons: [
          { label: "Yes, Exchange", value: true },
          { label: "No, Skip", value: false },
        ],
      });

      if (!wantsToExchange) {
        return;
      }
    }

    // Choose target player
    let targetPlayerIndex: number;
    if (validPlayers.length === 1) {
      targetPlayerIndex = validPlayers[0];
    } else {
      const choices: ChoiceButton<number>[] = validPlayers.map((p) => ({
        label: this.seats[p].character!,
        value: p,
      }));

      targetPlayerIndex = await seat.controller.chooseButton({
        title: `${seat.character} - Choose Exchange Partner`,
        message: "Choose who to exchange with:",
        buttons: choices,
      });
    }

    // Perform exchange
    await performExchange(this, seat.seatIndex, targetPlayerIndex);

    // Mark exchange as made in 1-player mode
    if (this.playerCount === 1) {
      setupContext.exchangeMade = true;
    }
  }

  // Check if seat has won a specific card
  hasCard(seat: Seat, suit: Suit, value: number): boolean {
    return seat
      .getAllWonCards()
      .some((card) => card.suit === suit && card.value === value);
  }

  // Check if card has been won by someone else
  cardGone(seat: Seat, suit: Suit, value: number): boolean {
    for (const otherSeat of this.seats) {
      if (otherSeat.seatIndex !== seat.seatIndex) {
        if (this.hasCard(otherSeat, suit, value)) {
          return true;
        }
      }
    }
    return false;
  }

  // Get number of tricks remaining to be played
  tricksRemaining(): number {
    return this.tricksToPlay - this.currentTrickNumber;
  }

  // Display simple status icon
  displaySimple(met: boolean, completable: boolean): string {
    if (met) {
      return '<span class="success">✓</span>';
    } else if (!completable) {
      return '<span class="fail">✗ (impossible)</span>';
    } else {
      return '<span class="fail">✗</span>';
    }
  }

  // Display threat card status
  displayThreatCard(_seat: Seat, met: boolean, completable: boolean): string {
    return this.displaySimple(met, completable);
  }

  // Give a card from one seat to another
  async giveCard(fromSeat: Seat, toSeat: Seat): Promise<void> {
    const availableCards = fromSeat.hand!.getAvailableCards();

    if (availableCards.length === 0) {
      throw new Error(`${fromSeat.getDisplayName()} has no cards to give`);
    }

    const sortedCards = availableCards.sort((a, b) => {
      if (a.suit !== b.suit) {
        const suitOrder = ["rings", "mountains", "shadows", "forests", "hills"];
        return suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
      }
      return a.value - b.value;
    });

    const cardToGive = await fromSeat.controller.chooseCard({
      title: `${fromSeat.character} - Give Card`,
      message: `Choose a card to give to ${toSeat.getDisplayName()}`,
      cards: sortedCards,
    });

    // Transfer the card
    fromSeat.hand!.removeCard(cardToGive);
    toSeat.hand!.addCard(cardToGive);

    addToGameLog(
      `${fromSeat.getDisplayName()} gives ${cardToGive.value} of ${cardToGive.suit} to ${toSeat.getDisplayName()}`,
    );
    displayHands(this, this.seats);
  }
}

// ===== ASYNC HELPERS =====

// ===== GAME FUNCTIONS =====

function getPlayerDisplayName(gameState: Game, playerIndex: number): string {
  return gameState.seats[playerIndex].getDisplayName();
}

function addToGameLog(message: string, important: boolean = false): void {
  const logDiv = document.getElementById("gameLog")!;
  const entry = document.createElement("div");
  entry.className = "log-entry" + (important ? " important" : "");
  entry.textContent = message;
  logDiv.appendChild(entry);

  // Auto-scroll to bottom
  logDiv.scrollTop = logDiv.scrollHeight;
}

function clearGameLog(): void {
  document.getElementById("gameLog")!.innerHTML = "";
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  const normalSuits: Suit[] = ["mountains", "shadows", "forests", "hills"];

  // Add normal suits (1-8)
  for (const suit of normalSuits) {
    for (let value = 1; value <= 8; value++) {
      deck.push({ suit, value });
    }
  }

  // Add rings suit (1-5)
  for (let value = 1; value <= 5; value++) {
    deck.push({ suit: "rings", value });
  }

  return deck;
}

function findPlayerWithCard(hands: Card[][], needle: Card): number {
  const idx = hands.findIndex((hand: Card[]) =>
    hand.some(
      (card) => card.suit === needle.suit && card.value === needle.value,
    ),
  );
  if (idx < 0) {
    throw new Error("Needle not found");
  }
  return idx;
}

function isLegalMove(
  gameState: Game,
  playerIndex: number,
  card: Card,
): boolean {
  const playerHand = gameState.seats[playerIndex].hand!.getAvailableCards();

  // If leading the trick
  if (gameState.currentTrick.length === 0) {
    // Can't lead rings unless:
    // 1. Rings have been broken, OR
    // 2. Player only has rings
    if (card.suit === "rings") {
      const onlyHasRings = playerHand.every((c) => c.suit === "rings");
      if (!gameState.ringsBroken && !onlyHasRings) {
        return false;
      }
    }
    return true;
  }

  // Must follow suit if possible
  const hasLeadSuit = playerHand.some((c) => c.suit === gameState.leadSuit);

  if (hasLeadSuit) {
    return card.suit === gameState.leadSuit;
  }

  // If can't follow suit, can play anything
  return true;
}

function getLegalMoves(gameState: Game, playerIndex: number): Card[] {
  const availableCards = gameState.seats[playerIndex].hand!.getAvailableCards();
  return availableCards.filter((card) =>
    isLegalMove(gameState, playerIndex, card),
  );
}

function updatePlayerHeadings(gameState: Game): void {
  for (const seat of gameState.seats) {
    const nameElement = document.getElementById(
      `playerName${seat.seatIndex + 1}`,
    )!;
    const objectiveElement = document.getElementById(
      `objective${seat.seatIndex + 1}`,
    )!;
    const character = seat.character;

    if (character) {
      if (seat.seatIndex === 0) {
        // Human player - show "You"
        nameElement.textContent = `${character} (You)`;
      } else if (seat.isPyramid) {
        // Pyramid player - indicate it's the pyramid
        nameElement.textContent = `${character} (Pyramid)`;
      } else {
        // AI players - show character name
        nameElement.textContent = character;
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
}

// ===== EXCHANGE HELPER FUNCTIONS =====

async function chooseCardToGive(
  gameState: Game,
  fromPlayer: number,
  toPlayer: number,
): Promise<Card> {
  const isFrodo = gameState.seats[fromPlayer].character === "Frodo";

  const availableCards = gameState.seats[fromPlayer].hand!.getAvailableCards();
  const sortedCards = sortHand([...availableCards]);

  // Filter out 1 of Rings if Frodo (only pass playable cards)
  const playableCards = sortedCards.filter((card) => {
    const isOneRing = card.suit === "rings" && card.value === 1;
    return !isFrodo || !isOneRing;
  });

  let message = `Select a card to give to ${getPlayerDisplayName(gameState, toPlayer)}`;
  if (isFrodo) {
    message += " (Frodo cannot give away the 1 of Rings)";
  }

  const selectedCard = await gameState.seats[fromPlayer].controller.chooseCard({
    title: "Choose Card to Exchange",
    message,
    cards: playableCards,
  });

  return selectedCard;
}

async function chooseCardToReturn(
  gameState: Game,
  fromPlayer: number,
  _toPlayer: number,
  receivedCard: Card,
): Promise<Card> {
  const isFrodo = gameState.seats[fromPlayer].character === "Frodo";

  const availableCards = gameState.seats[fromPlayer].hand!.getAvailableCards();
  const tempHand = sortHand([...availableCards, receivedCard]);

  // Filter out 1 of Rings if Frodo (only pass playable cards)
  const playableCards = tempHand.filter((card) => {
    const isOneRing = card.suit === "rings" && card.value === 1;
    return !isFrodo || !isOneRing;
  });

  let message = `You received ${receivedCard.value} of ${receivedCard.suit}. Select a card to give back`;
  if (isFrodo) {
    message += " (Frodo cannot give away the 1 of Rings)";
  }

  const selectedCard = await gameState.seats[fromPlayer].controller.chooseCard({
    title: "Choose Card to Return",
    message,
    cards: playableCards,
  });

  return selectedCard;
}

async function performExchange(
  gameState: Game,
  fromPlayer: number,
  toPlayer: number,
): Promise<void> {
  updateGameStatus(
    gameState,
    `${getPlayerDisplayName(gameState, fromPlayer)} exchanges with ${getPlayerDisplayName(gameState, toPlayer)}`,
  );
  // Step 1: Give card
  const cardToGive = await chooseCardToGive(gameState, fromPlayer, toPlayer);
  gameState.seats[fromPlayer].hand!.removeCard(cardToGive);

  // Only log if human player is involved
  if (fromPlayer === 0 || toPlayer === 0) {
    addToGameLog(
      `${getPlayerDisplayName(gameState, fromPlayer)} gives ${cardToGive.value} of ${cardToGive.suit} to ${getPlayerDisplayName(gameState, toPlayer)}`,
    );
  } else {
    addToGameLog(
      `${getPlayerDisplayName(gameState, fromPlayer)} exchanges with ${getPlayerDisplayName(gameState, toPlayer)}`,
    );
  }

  updateGameStatus(
    gameState,
    `${getPlayerDisplayName(gameState, fromPlayer)} gives ${cardToGive.value} of ${cardToGive.suit} to ${getPlayerDisplayName(gameState, toPlayer)}`,
  );
  displayHands(gameState, gameState.seats);

  // Step 2: Return card
  const cardToReturn = await chooseCardToReturn(
    gameState,
    toPlayer,
    fromPlayer,
    cardToGive,
  );

  // Check if this is the card that was just given
  const isReceivedCard =
    cardToReturn.suit === cardToGive.suit &&
    cardToReturn.value === cardToGive.value;

  if (!isReceivedCard) {
    // Remove from toPlayer's hand
    gameState.seats[toPlayer].hand!.removeCard(cardToReturn);
  }

  // Add card to fromPlayer's hand
  gameState.seats[fromPlayer].hand!.addCard(cardToReturn);

  // Add the originally exchanged card to toPlayer's hand (if they didn't return it)
  if (!isReceivedCard) {
    gameState.seats[toPlayer].hand!.addCard(cardToGive);
  }

  // Only log return details if human player is involved
  if (fromPlayer === 0 || toPlayer === 0) {
    addToGameLog(
      `${getPlayerDisplayName(gameState, toPlayer)} returns ${cardToReturn.value} of ${cardToReturn.suit}`,
    );
  }

  updateGameStatus(
    gameState,
    `${getPlayerDisplayName(gameState, toPlayer)} returns ${cardToReturn.value} of ${cardToReturn.suit}`,
  );
  displayHands(gameState, gameState.seats);
}

function checkObjective(gameState: Game, seat: Seat): boolean {
  return seat.characterDef!.objective.check(gameState, seat);
}

function isObjectiveCompletable(gameState: Game, seat: Seat): boolean {
  return seat.characterDef!.objective.isCompletable(gameState, seat);
}

function getGameOverMessage(gameState: Game): string {
  const results: string[] = [];
  const objectiveWinners: number[] = [];

  for (const seat of gameState.seats) {
    const trickCount = seat.getTrickCount();
    const objectiveMet = checkObjective(gameState, seat);

    const playerName = seat.getDisplayName();
    const status = objectiveMet ? "✓ SUCCESS" : "✗ FAILED";

    results.push(`${playerName}: ${status} (${trickCount} tricks)`);

    if (objectiveMet) {
      objectiveWinners.push(seat.seatIndex);
    }
  }

  let message = "Game Over!\n\n";
  message += results.join("\n");

  if (objectiveWinners.length > 0) {
    const winnerNames = objectiveWinners.map((p) => {
      return gameState.seats[p].getDisplayName();
    });
    message += `\n\nObjectives completed by: ${winnerNames.join(", ")}`;
  } else {
    message += "\n\nNo one completed their objective!";
  }

  return message;
}

function updateTricksDisplay(gameState: Game): void {
  for (const seat of gameState.seats) {
    const trickCount = seat.getTrickCount();

    // Update trick count
    document.getElementById(`tricks${seat.seatIndex + 1}`)!.textContent =
      `Tricks: ${trickCount}`;

    // Update objective status
    const statusDiv = document.getElementById(
      `objectiveStatus${seat.seatIndex + 1}`,
    )!;

    const characterDef = seat.characterDef;
    if (!characterDef) {
      statusDiv.innerHTML = "";
      continue;
    }

    statusDiv.innerHTML = characterDef.display.renderStatus(gameState, seat);

    // Update threat card display
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

function displayTrick(gameState: Game): void {
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

function highlightActivePlayer(activePlayer: number): void {
  document.querySelectorAll(".player").forEach((div) => {
    if ((div as HTMLElement).dataset.player === String(activePlayer + 1)) {
      div.classList.add("active");
    } else {
      div.classList.remove("active");
    }
  });
}

function displayHands(
  gameState: Game,
  seats: Seat[],
  activePlayer?: number,
): void {
  highlightActivePlayer(gameState.currentPlayer);

  // Display each player's hand
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

function updateGameStatus(
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

// ===== NEW GAME LOOP FUNCTIONS =====

function checkForImpossibleObjectives(gameState: Game): void {
  for (const seat of gameState.seats) {
    if (!isObjectiveCompletable(gameState, seat)) {
      const character = seat.character;
      if (character) {
        addToGameLog(
          `${seat.getDisplayName()}'s objective is now impossible!`,
          true,
        );
      }
    }
  }
}

function isGameOver(gameState: Game): boolean {
  // Game ends when we've played all the tricks
  if (gameState.currentTrickNumber >= gameState.tricksToPlay) {
    return true;
  }

  // Also end game if any objective has become impossible
  for (const seat of gameState.seats) {
    if (!isObjectiveCompletable(gameState, seat)) {
      return true;
    }
  }

  return false;
}

function determineTrickWinner(gameState: Game): number {
  delay(500);

  // Check if 1 of rings was played as trump
  const trumpPlay = gameState.currentTrick.find((play) => play.isTrump);

  let winningPlay: TrickPlay;

  if (trumpPlay) {
    // Trump wins
    winningPlay = trumpPlay;
  } else {
    // Find highest card of lead suit
    winningPlay = gameState.currentTrick[0];

    for (let i = 1; i < gameState.currentTrick.length; i++) {
      const play = gameState.currentTrick[i];
      if (
        play.card.suit === gameState.leadSuit &&
        play.card.value > winningPlay.card.value
      ) {
        winningPlay = play;
      }
    }
  }

  return winningPlay.playerIndex;
}

async function playSelectedCard(
  gameState: Game,
  playerIndex: number,
  card: Card,
): Promise<void> {
  // Remove card from hand
  gameState.seats[playerIndex].hand!.removeCard(card);

  // Track played card
  gameState.seats[playerIndex].playedCards.push(card);

  // Add to current trick
  gameState.currentTrick.push({ playerIndex, card, isTrump: false });

  // Log the play
  addToGameLog(
    `${getPlayerDisplayName(gameState, playerIndex)} plays ${card.value} of ${card.suit}`,
  );

  // Set lead suit if first card
  if (gameState.currentTrick.length === 1) {
    gameState.leadSuit = card.suit;
  }

  // Break rings if rings played
  if (card.suit === "rings") {
    gameState.ringsBroken = true;
  }
}

async function selectCardFromPlayer(
  gameState: Game,
  playerIndex: number,
  legalMoves: Card[],
): Promise<Card> {
  gameState.currentPlayer = playerIndex;

  const controller = gameState.seats[playerIndex].controller;
  const renderCards = () =>
    displayHands(gameState, gameState.seats, playerIndex);

  return await controller.selectCard(legalMoves, renderCards);
}

async function runTrickTakingPhase(gameState: Game): Promise<void> {
  addToGameLog("=== PLAYING PHASE ===", true);

  while (!isGameOver(gameState)) {
    // === TRICK LOOP ===
    const trickLeader = gameState.currentPlayer;
    gameState.currentTrick = [];
    gameState.leadSuit = null;

    // Clear trick display
    document.getElementById("trickCards")!.innerHTML = "";

    addToGameLog(`--- Trick ${gameState.currentTrickNumber + 1} ---`);

    // Play cards from each player in turn
    for (let i = 0; i < gameState.numCharacters; i++) {
      const playerIndex = (trickLeader + i) % gameState.numCharacters;

      // Skip players with no cards
      if (gameState.seats[playerIndex].hand!.isEmpty()) {
        addToGameLog(
          `${getPlayerDisplayName(gameState, playerIndex)} passes (no cards)`,
        );
        continue;
      }

      highlightActivePlayer(playerIndex);
      updateGameStatus(
        gameState,
        playerIndex === 0
          ? "Your turn! Click a card to play."
          : `${getPlayerDisplayName(gameState, playerIndex)}'s turn...`,
      );

      // Get legal moves
      const legalMoves = getLegalMoves(gameState, playerIndex);

      // Ask controller to select card
      const selectedCard = await selectCardFromPlayer(
        gameState,
        playerIndex,
        legalMoves,
      );

      // Play the card
      await playSelectedCard(gameState, playerIndex, selectedCard);

      displayTrick(gameState);
      displayHands(gameState, gameState.seats); // Redisplay with no active player
    }

    // Check for 1 of Rings trump decision
    const oneRingPlay = gameState.currentTrick.find(
      (play) => play.card.suit === "rings" && play.card.value === 1,
    );

    if (oneRingPlay) {
      const useTrump = await gameState.seats[
        oneRingPlay.playerIndex
      ].controller.chooseButton({
        title: "You played the 1 of Rings!",
        message: "Do you want to use it as trump to win this trick?",
        buttons: [
          { label: "Yes, Win Trick", value: true },
          { label: "No, Play Normal", value: false },
        ],
      });
      oneRingPlay.isTrump = useTrump;
      displayTrick(gameState);
    }

    // Determine winner
    const winnerIndex = determineTrickWinner(gameState);

    // Award trick to winner
    const trickCards = gameState.currentTrick.map((play) => play.card);
    gameState.seats[winnerIndex].addTrick(
      gameState.currentTrickNumber,
      trickCards,
    );
    gameState.currentTrickNumber++;
    gameState.lastTrickWinner = winnerIndex;

    // Log winner
    addToGameLog(
      `${getPlayerDisplayName(gameState, winnerIndex)} wins the trick!`,
      true,
    );

    // Reveal new cards (pyramid, solitaire)
    for (const seat of gameState.seats) {
      seat.hand!.onTrickComplete();
    }

    displayHands(gameState, gameState.seats);
    updateTricksDisplay(gameState);

    // Check for impossible objectives
    checkForImpossibleObjectives(gameState);

    // Winner leads next trick
    gameState.currentPlayer = winnerIndex;
  }
}

async function runSetupPhase(gameState: Game): Promise<void> {
  addToGameLog("=== SETUP PHASE ===", true);

  // Track exchange status for 1-player mode (only one exchange allowed)
  const setupContext: GameSetupContext = {
    frodoSeat: gameState.seats[gameState.currentPlayer] || null,
    exchangeMade: false,
  };

  // Loop over all characters starting from currentPlayer
  for (let i = 0; i < gameState.numCharacters; i++) {
    const playerIndex = (gameState.currentPlayer + i) % gameState.numCharacters;

    highlightActivePlayer(playerIndex);

    const seat = gameState.seats[playerIndex];
    updateGameStatus(gameState, `${seat.getDisplayName()} - Setup Phase`);
    await seat.characterDef!.setup(gameState, seat, setupContext);
  }
}

async function runCharacterAssignment(gameState: Game): Promise<void> {
  addToGameLog("=== CHARACTER ASSIGNMENT ===", true);

  const startPlayer = gameState.currentPlayer; // Player with 1 of Rings

  // First player automatically gets Frodo
  addToGameLog(
    `${getPlayerDisplayName(gameState, startPlayer)} gets Frodo (has 1 of Rings)`,
    true,
  );
  gameState.seats[startPlayer].character = "Frodo";
  gameState.seats[startPlayer].characterDef = characterRegistry.get("Frodo")!;
  gameState.availableCharacters = gameState.availableCharacters.filter(
    (c) => c !== "Frodo",
  );

  // For 2-player mode, assign pyramid controller
  if (gameState.playerCount === 2) {
    const pyramidIndex = gameState.seats.findIndex((s) => s.isPyramid);
    let pyramidControllerIndex: number;

    if (startPlayer === pyramidIndex) {
      // Frodo IS the pyramid, so player to their right controls it
      pyramidControllerIndex = (startPlayer + 2) % 3;
    } else {
      // Frodo is not the pyramid, so Frodo controls the pyramid
      pyramidControllerIndex = startPlayer;
    }

    gameState.seats[pyramidIndex].controller =
      gameState.seats[pyramidControllerIndex].controller;

    addToGameLog(
      `Pyramid will be controlled by ${getPlayerDisplayName(gameState, pyramidControllerIndex)}`,
      true,
    );
  }

  updatePlayerHeadings(gameState);
  displayHands(gameState, gameState.seats);

  // Loop through remaining players
  for (let i = 1; i < gameState.numCharacters; i++) {
    const playerIndex = (startPlayer + i) % gameState.numCharacters;

    highlightActivePlayer(playerIndex);

    // Build character buttons
    const buttons: ChoiceButton<string>[] = gameState.availableCharacters.map(
      (char) => ({
        label: char,
        value: char,
      }),
    );

    // Ask controller to choose
    const character = await gameState.seats[
      playerIndex
    ].controller.chooseButton({
      title: `${getPlayerDisplayName(gameState, playerIndex)} - Choose Your Character`,
      message: "Select a character to play as",
      buttons,
    });

    // Assign character
    addToGameLog(
      `${getPlayerDisplayName(gameState, playerIndex)} chose ${character}`,
    );
    const seat = gameState.seats[playerIndex];
    seat.character = character;
    seat.characterDef = characterRegistry.get(seat.character)!;
    gameState.availableCharacters = gameState.availableCharacters.filter(
      (c) => c !== character,
    );

    updatePlayerHeadings(gameState);
  }

  displayHands(gameState, gameState.seats);
}

async function runGame(gameState: Game): Promise<void> {
  await runCharacterAssignment(gameState);
  await runSetupPhase(gameState);
  await runTrickTakingPhase(gameState);

  const gameOverMsg = getGameOverMessage(gameState);
  addToGameLog("--- GAME OVER ---", true);
  addToGameLog(gameOverMsg.split("\n").join(" | "));
  updateGameStatus(gameState, "Game Over! " + gameOverMsg);
}

// ===== END NEW GAME LOOP FUNCTIONS =====

async function newGame(): Promise<void> {
  // Get player count from dropdown
  const playerCount = parseInt(
    (document.getElementById("playerCount") as HTMLSelectElement).value,
  );
  // For 2-player mode, we have 3 characters (one is pyramid)
  // For 1-player mode, we have 4 characters (all human-controlled)
  let numCharacters: number;
  if (playerCount === 1) {
    numCharacters = 4;
  } else if (playerCount === 2) {
    numCharacters = 3;
  } else {
    numCharacters = playerCount;
  }
  const cardsPerPlayer = numCharacters === 3 ? 12 : 9;

  // Set data attribute on body to control CSS
  document.body.setAttribute("data-player-count", playerCount.toString());

  let deck: Card[], lostCard: Card;

  // Keep shuffling until the lost card is not the 1 of rings
  do {
    // Create and shuffle deck
    deck = shuffleDeck(createDeck());

    // Deal lost card
    lostCard = deck.shift()!;
  } while (lostCard.suit === "rings" && lostCard.value === 1);

  // Display the lost card
  const lostCardDiv = document.getElementById("lostCard")!;
  lostCardDiv.innerHTML = "";
  lostCardDiv.appendChild(createCardElement(lostCard));

  // Deal cards to temporary arrays first
  const playerCards: Card[][] = Array.from({ length: numCharacters }, () => []);
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < numCharacters; p++) {
      playerCards[p].push(deck.shift()!);
    }
  }

  // For 2-player mode, randomly choose which of the 3 internal players is the pyramid
  let pyramidPlayerIndex: number | null = null;
  if (playerCount === 2) {
    // Choose pyramid player (could be 1 or 2, never 0 since that's the human)
    // We'll determine the controller after character assignment based on Frodo
    pyramidPlayerIndex = Math.random() < 0.5 ? 1 : 2;
  }

  // Find who has the 1 of rings before creating hands
  const startPlayer = findPlayerWithCard(playerCards, {
    suit: "rings",
    value: 1,
  });

  // Initialize Seat instances with their dealt cards
  const seats: Seat[] = [];
  for (let i = 0; i < numCharacters; i++) {
    // Determine controller - in 1-player mode, all seats are human-controlled
    const controller: Controller =
      playerCount === 1 || i === 0 ? new HumanController() : new AIController();
    const seat = new Seat(i, controller);

    // Create Hand objects based on player type, passing initial cards
    if (playerCount === 1) {
      // 1-player solitaire mode - all seats use SolitaireHand
      seat.hand = new SolitaireHand(playerCards[i]);
    } else if (i === pyramidPlayerIndex) {
      // Pyramid is always visible
      seat.hand = new PyramidHand(playerCards[i]);
      seat.isPyramid = true;
    } else if (i === 0) {
      // Player 0 is the human player - always visible
      seat.hand = new PlayerHand(playerCards[i]);
    } else {
      // AI players - wrap in HiddenHand
      seat.hand = new HiddenHand(playerCards[i]);
    }

    seats.push(seat);
  }

  // Set up pyramid reveal callback for logging
  if (pyramidPlayerIndex !== null) {
    (seats[pyramidPlayerIndex].hand as PyramidHand).onCardRevealed(
      (index: number, card: Card) => {
        addToGameLog(
          `Card at position ${index} in pyramid is revealed: ${card.value} of ${card.suit}`,
        );
      },
    );
  }

  const availableCharacters = shuffleDeck(allCharacters); // .slice(0, 4);
  availableCharacters.push("Frodo");

  // Create game instance
  const gameState = new Game(
    playerCount,
    numCharacters,
    seats,
    lostCard,
    startPlayer,
  );
  gameState.availableCharacters = availableCharacters;

  // Clear trick display
  document.getElementById("trickCards")!.innerHTML = "";

  // Reset tricks won display
  updateTricksDisplay(gameState);

  // Reset player headings
  resetPlayerHeadings();

  // Clear and initialize game log
  clearGameLog();
  addToGameLog("=== NEW GAME STARTED ===", true);
  addToGameLog(`Lost card: ${lostCard.value} of ${lostCard.suit}`);

  // Display initial state
  displayHands(gameState, gameState.seats);

  // Run the game loop
  await runGame(gameState);
}

function resetPlayerHeadings(): void {
  for (let p = 0; p < 4; p++) {
    const nameElement = document.getElementById(`playerName${p + 1}`)!;
    const objectiveElement = document.getElementById(`objective${p + 1}`)!;
    nameElement.textContent = `Player ${p + 1}`;
    objectiveElement.textContent = "";
  }
}

function copyGameLog(): void {
  const logDiv = document.getElementById("gameLog")!;
  const logEntries = Array.from(logDiv.querySelectorAll(".log-entry"));
  const logText = logEntries.map((entry) => entry.textContent).join("\n");

  navigator.clipboard.writeText(logText).then(
    () => {
      // Temporarily change button text to show success
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

// Expose functions to global scope for inline event handlers
(window as any).newGame = () => {
  newGame().catch((error) => {
    console.error("Error in newGame:", error);
    const statusDiv = document.getElementById("gameStatus")!;
    statusDiv.textContent = "Error starting game. Check console for details.";
  });
};
(window as any).copyGameLog = copyGameLog;
