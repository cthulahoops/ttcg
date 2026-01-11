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
  delay,
} from "./utils.js";
import { Seat } from "./seat.js";
import { AIController } from "./controllers.js";
import { characterRegistry, allCharacterNames } from "./characters/registry.js";
import type {
  Card,
  Suit,
  ThreatCard,
  Controller,
  ChoiceButton,
} from "./types.js";

// All possible characters in the game (except Frodo who is automatically assigned)
const allCharacters = allCharacterNames.filter((name) => name !== "Frodo");

// ===== INTERFACES =====

export interface TrickPlay {
  playerIndex: number;
  card: Card;
  isTrump: boolean;
}

interface GameSetupContext {
  frodoSeat: Seat | null;
  exchangeMade?: boolean;
}

export interface Exchange {
  fromSeat: Seat;
  toSeat: Seat;
  cardFromFirst: Card;
  cardFromSecond: Card;
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

  async takeLostCard(seat: Seat): Promise<void> {
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
      this.lostCard = null;
      addToGameLog(`${seat.getDisplayName()} takes the lost card`);
      displayHands(this, this.seats, isLegalMove);
      updateLostCardDisplay(this);
    }
  }

  async exchangeWithLostCard(
    seat: Seat,
    _setupContext: GameSetupContext,
  ): Promise<void> {
    if (!this.lostCard) return;

    const cards = seat.hand!.getCards
      ? (seat.hand as any).getCards()
      : seat.hand!.getAllCards();
    const sortedCards = sortHand(cards);

    const cardToGive = await seat.controller.chooseCard({
      title: `${seat.character} - Exchange with Lost Card`,
      message: `Choose a card to exchange with the lost card (${this.lostCard.value} of ${this.lostCard.suit})`,
      cards: sortedCards,
    });

    seat.hand!.removeCard(cardToGive);
    seat.hand!.addCard(this.lostCard);
    this.lostCard = cardToGive;

    addToGameLog(`${seat.getDisplayName()} exchanges with the lost card`);
    displayHands(this, this.seats, isLegalMove);
    updateLostCardDisplay(this);
  }

  revealHand(seat: Seat): void {
    // This would need to modify the hand to be always visible
    // For now, just log it
    addToGameLog(
      `${seat.getDisplayName()}'s hand is now visible to all players`,
    );
    seat.hand = seat.hand!.revealed();
  }

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

  async chooseThreatCard(seat: Seat): Promise<void> {
    if (this.threatDeck.length === 0) {
      addToGameLog(`${seat.getDisplayName()} - No threat cards available!`);
      throw new Error("Threat deck is empty!");
    }

    const threatCards: ThreatCard[] = this.threatDeck.map((value) => ({
      value,
      suit: "threat",
    }));

    const choice = await seat.controller.chooseCard({
      title: `${seat.character} - Choose Threat Card`,
      message: "Choose a threat card:",
      cards: threatCards,
    });

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

  async setupExchange(
    seat: Seat,
    setupContext: GameSetupContext,
    canExchangeWith: (character: string) => boolean,
  ): Promise<Exchange | null> {
    if (this.playerCount === 1 && setupContext.exchangeMade) {
      return null;
    }

    const validPlayers: Seat[] = [];
    for (const otherSeat of this.seats) {
      if (otherSeat.seatIndex !== seat.seatIndex && otherSeat.character) {
        if (canExchangeWith(otherSeat.character)) {
          validPlayers.push(otherSeat);
        }
      }
    }

    if (validPlayers.length === 0) {
      return null;
    }

    if (this.playerCount === 1) {
      const targetDescription =
        validPlayers.length === 1
          ? validPlayers[0].character!
          : validPlayers.map((p) => p.character).join(" or ");

      const wantsToExchange = await seat.controller.chooseButton({
        title: `${seat.character} - Exchange?`,
        message: `Do you want ${seat.character} to exchange with ${targetDescription}?`,
        buttons: [
          { label: "Yes, Exchange", value: true },
          { label: "No, Skip", value: false },
        ],
      });

      if (!wantsToExchange) {
        return null;
      }
    }

    let targetSeat: Seat;
    if (validPlayers.length === 1) {
      targetSeat = validPlayers[0];
    } else {
      const choices: ChoiceButton<number>[] = validPlayers.map((p) => ({
        label: p.character!,
        value: p.seatIndex,
      }));

      const targetIndex = await seat.controller.chooseButton({
        title: `${seat.character} - Choose Exchange Partner`,
        message: "Choose who to exchange with:",
        buttons: choices,
      });

      targetSeat = this.seats[targetIndex];
    }

    const availableFrom = seat.hand!.getAvailableCards();
    const isFrodoFrom = seat.character === "Frodo";
    const playableFrom = isFrodoFrom
      ? availableFrom.filter(
          (card) => !(card.suit === "rings" && card.value === 1),
        )
      : availableFrom;

    let messageFrom = `Choose a card to give to ${targetSeat.getDisplayName()}`;
    if (isFrodoFrom) {
      messageFrom += " (Frodo cannot give away the 1 of Rings)";
    }

    const cardFromFirst = await seat.controller.chooseCard({
      title: `${seat.character} - Exchange with ${targetSeat.character}`,
      message: messageFrom,
      cards: sortHand(playableFrom),
    });

    // The second player doesn't see what they're receiving (hidden information mechanic)
    const availableTo = targetSeat.hand!.getAvailableCards();
    const isFrodoTo = targetSeat.character === "Frodo";
    const playableTo = isFrodoTo
      ? availableTo.filter(
          (card) => !(card.suit === "rings" && card.value === 1),
        )
      : availableTo;

    let messageTo = `Choose a card to give to ${seat.getDisplayName()}`;
    if (isFrodoTo) {
      messageTo += " (Frodo cannot give away the 1 of Rings)";
    }

    const cardFromSecond = await targetSeat.controller.chooseCard({
      title: `${targetSeat.character} - Exchange with ${seat.character}`,
      message: messageTo,
      cards: sortHand(playableTo),
    });

    return {
      fromSeat: seat,
      toSeat: targetSeat,
      cardFromFirst,
      cardFromSecond,
    };
  }

  completeExchange(exchange: Exchange, setupContext: GameSetupContext): void {
    const { fromSeat, toSeat, cardFromFirst, cardFromSecond } = exchange;

    fromSeat.hand!.removeCard(cardFromFirst);
    toSeat.hand!.removeCard(cardFromSecond);

    fromSeat.hand!.addCard(cardFromSecond);
    toSeat.hand!.addCard(cardFromFirst);

    addToGameLog(
      `${fromSeat.getDisplayName()} gives ${cardFromFirst.value} of ${cardFromFirst.suit} to ${toSeat.getDisplayName()}`,
    );
    addToGameLog(
      `${toSeat.getDisplayName()} gives ${cardFromSecond.value} of ${cardFromSecond.suit} to ${fromSeat.getDisplayName()}`,
    );

    if (this.playerCount === 1) {
      setupContext.exchangeMade = true;
    }
  }

  async exchange(
    seat: Seat,
    setupContext: GameSetupContext,
    canExchangeWith: (character: string) => boolean,
  ): Promise<void> {
    const exchangeSetup = await this.setupExchange(
      seat,
      setupContext,
      canExchangeWith,
    );

    if (exchangeSetup) {
      this.completeExchange(exchangeSetup, setupContext);
      displayHands(this, this.seats, isLegalMove);
    }
  }

  hasCard(seat: Seat, suit: Suit, value: number): boolean {
    return seat
      .getAllWonCards()
      .some((card) => card.suit === suit && card.value === value);
  }

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

  tricksRemaining(): number {
    return this.tricksToPlay - this.currentTrickNumber;
  }

  log(message: string, secret: boolean = false): void {
    addToGameLog(message, secret);
  }

  refreshDisplay(): void {
    displayHands(this, this.seats, isLegalMove);
  }

  displaySimple(met: boolean, completable: boolean): string {
    if (met) {
      return '<span class="success">✓</span>';
    } else if (!completable) {
      return '<span class="fail">✗ (impossible)</span>';
    } else {
      return '<span class="fail">✗</span>';
    }
  }

  displayThreatCard(_seat: Seat, met: boolean, completable: boolean): string {
    return this.displaySimple(met, completable);
  }

  async giveCard(fromSeat: Seat, toSeat: Seat): Promise<void> {
    const availableCards = fromSeat.hand!.getAvailableCards();

    if (availableCards.length === 0) {
      throw new Error(`${fromSeat.getDisplayName()} has no cards to give`);
    }

    const cardToGive = await fromSeat.controller.chooseCard({
      title: `${fromSeat.character} - Give Card`,
      message: `Choose a card to give to ${toSeat.getDisplayName()}`,
      cards: sortHand(availableCards),
    });

    fromSeat.hand!.removeCard(cardToGive);
    toSeat.hand!.addCard(cardToGive);

    addToGameLog(
      `${fromSeat.getDisplayName()} gives ${cardToGive.value} of ${cardToGive.suit} to ${toSeat.getDisplayName()}`,
    );
    displayHands(this, this.seats, isLegalMove);
  }
}

// ===== STUB DISPLAY FUNCTIONS =====
// These are placeholder implementations that get called but do nothing
// In the browser, these are overridden by the actual display functions from client/display.ts
function addToGameLog(_msg: string, _important?: boolean) {}
function displayHands(_game: any, _seats: any, _isPlayable?: any, _activePlayer?: any) {}
function displayTrick(_game: any) {}
function getPlayerDisplayName(gameState: Game, playerIndex: number): string {
  return gameState.seats[playerIndex].getDisplayName();
}
function highlightActivePlayer(_playerIndex: number) {}
function updateGameStatus(_gameState: Game, _msg?: string) {}
function updateTricksDisplay(_gameState: Game) {}
function updateLostCardDisplay(_gameState: Game) {}
function updatePlayerHeadings(_gameState: Game) {}
function resetPlayerHeadings() {}
function clearGameLog() {}
function copyGameLog() {}

// ===== GAME FUNCTIONS =====


function createDeck(): Card[] {
  const deck: Card[] = [];
  const normalSuits: Suit[] = ["mountains", "shadows", "forests", "hills"];

  for (const suit of normalSuits) {
    for (let value = 1; value <= 8; value++) {
      deck.push({ suit, value });
    }
  }

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

  if (gameState.currentTrick.length === 0) {
    if (card.suit === "rings") {
      const onlyHasRings = playerHand.every((c) => c.suit === "rings");
      if (!gameState.ringsBroken && !onlyHasRings) {
        return false;
      }
    }
    return true;
  }

  const hasLeadSuit = playerHand.some((c) => c.suit === gameState.leadSuit);

  if (hasLeadSuit) {
    return card.suit === gameState.leadSuit;
  }

  return true;
}

function getLegalMoves(gameState: Game, playerIndex: number): Card[] {
  const availableCards = gameState.seats[playerIndex].hand!.getAvailableCards();
  return availableCards.filter((card) =>
    isLegalMove(gameState, playerIndex, card),
  );
}

// ===== EXCHANGE HELPER FUNCTIONS =====

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
  if (gameState.currentTrickNumber >= gameState.tricksToPlay) {
    return true;
  }

  for (const seat of gameState.seats) {
    if (!isObjectiveCompletable(gameState, seat)) {
      return true;
    }
  }

  return false;
}

function determineTrickWinner(gameState: Game): number {
  delay(500);

  const trumpPlay = gameState.currentTrick.find((play) => play.isTrump);

  let winningPlay: TrickPlay;

  if (trumpPlay) {
    winningPlay = trumpPlay;
  } else {
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
  gameState.seats[playerIndex].hand!.removeCard(card);
  gameState.seats[playerIndex].playedCards.push(card);
  gameState.currentTrick.push({ playerIndex, card, isTrump: false });

  addToGameLog(
    `${getPlayerDisplayName(gameState, playerIndex)} plays ${card.value} of ${card.suit}`,
  );

  if (gameState.currentTrick.length === 1) {
    gameState.leadSuit = card.suit;
  }

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
    displayHands(gameState, gameState.seats, isLegalMove, playerIndex);

  return await controller.selectCard(legalMoves, renderCards);
}

async function runTrickTakingPhase(gameState: Game): Promise<void> {
  addToGameLog("=== PLAYING PHASE ===", true);

  while (!isGameOver(gameState)) {
    // === TRICK LOOP ===
    const trickLeader = gameState.currentPlayer;
    gameState.currentTrick = [];
    gameState.leadSuit = null;

    displayTrick(gameState);

    addToGameLog(`--- Trick ${gameState.currentTrickNumber + 1} ---`);

    for (let i = 0; i < gameState.numCharacters; i++) {
      const playerIndex = (trickLeader + i) % gameState.numCharacters;

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

      const legalMoves = getLegalMoves(gameState, playerIndex);

      const selectedCard = await selectCardFromPlayer(
        gameState,
        playerIndex,
        legalMoves,
      );

      await playSelectedCard(gameState, playerIndex, selectedCard);

      displayTrick(gameState);
      displayHands(gameState, gameState.seats, isLegalMove); // Redisplay with no active player
    }

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

    const winnerIndex = determineTrickWinner(gameState);

    const trickCards = gameState.currentTrick.map((play) => play.card);
    gameState.seats[winnerIndex].addTrick(
      gameState.currentTrickNumber,
      trickCards,
    );
    gameState.currentTrickNumber++;
    gameState.lastTrickWinner = winnerIndex;

    addToGameLog(
      `${getPlayerDisplayName(gameState, winnerIndex)} wins the trick!`,
      true,
    );

    for (const seat of gameState.seats) {
      seat.hand!.onTrickComplete();
    }

    displayHands(gameState, gameState.seats, isLegalMove);
    updateTricksDisplay(gameState);

    checkForImpossibleObjectives(gameState);

    gameState.currentPlayer = winnerIndex;
  }
}

async function runSetupPhase(gameState: Game): Promise<void> {
  addToGameLog("=== SETUP PHASE ===", true);

  const setupContext: GameSetupContext = {
    frodoSeat: gameState.seats[gameState.currentPlayer] || null,
    exchangeMade: false,
  };

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

  addToGameLog(
    `${getPlayerDisplayName(gameState, startPlayer)} gets Frodo (has 1 of Rings)`,
    true,
  );
  gameState.seats[startPlayer].character = "Frodo";
  gameState.seats[startPlayer].characterDef = characterRegistry.get("Frodo")!;
  gameState.availableCharacters = gameState.availableCharacters.filter(
    (c) => c !== "Frodo",
  );

  if (gameState.playerCount === 2) {
    const pyramidIndex = gameState.seats.findIndex((s) => s.isPyramid);
    let pyramidControllerIndex: number;

    if (startPlayer === pyramidIndex) {
      pyramidControllerIndex = (startPlayer + 2) % 3;
    } else {
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
  displayHands(gameState, gameState.seats, isLegalMove);

  for (let i = 1; i < gameState.numCharacters; i++) {
    const playerIndex = (startPlayer + i) % gameState.numCharacters;

    highlightActivePlayer(playerIndex);

    const buttons: ChoiceButton<string>[] = gameState.availableCharacters.map(
      (char) => ({
        label: char,
        value: char,
      }),
    );

    const character = await gameState.seats[
      playerIndex
    ].controller.chooseButton({
      title: `${getPlayerDisplayName(gameState, playerIndex)} - Choose Your Character`,
      message: "Select a character to play as",
      buttons,
    });

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

  displayHands(gameState, gameState.seats, isLegalMove);
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
