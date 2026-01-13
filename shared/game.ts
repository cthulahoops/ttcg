import {
  Hand as _Hand,
  PlayerHand,
  PyramidHand,
  SolitaireHand,
} from "./hands";
import {
  shuffleDeck,
  sortHand,
  delay,
} from "./utils";
import { Seat } from "./seat";
import { AIController, ProxyController } from "./controllers";
import { characterRegistry, allCharacterNames } from "./characters/registry";
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

export interface TrickPlay {
  playerIndex: number;
  card: Card;
  isTrump: boolean;
}

export interface CompletedTrick {
  plays: TrickPlay[];
  winner: number;
}

export interface GameSetupContext {
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
  completedTricks: CompletedTrick[];
  currentPlayer: number;
  leadPlayer: number;
  currentTrickNumber: number;
  leadSuit: Suit | null;
  ringsBroken: boolean;
  availableCharacters: string[];
  lostCard: Card | null;
  lastTrickWinner: number | null;
  threatDeck: number[];
  tricksToPlay: number;
  onStateChange?: (game: Game) => void;
  onLog?: (line: string, important?: boolean) => void;

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
    this.completedTricks = [];
    this.currentPlayer = startPlayer;
    this.leadPlayer = startPlayer;
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

  notifyStateChange(): void {
    this.onStateChange?.(this);
  }

  log(line: string, important?: boolean): void {
    this.onLog?.(line, important);
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
      this.log(`${seat.getDisplayName()} takes the lost card`);
      this.notifyStateChange();
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

    this.log(`${seat.getDisplayName()} exchanges with the lost card`);
    this.notifyStateChange();
  }

  revealHand(seat: Seat): void {
    // This would need to modify the hand to be always visible
    // For now, just log it
    this.log(
      `${seat.getDisplayName()}'s hand is now visible to all players`,
    );
    seat.hand!.reveal();
  }

  async drawThreatCard(
    seat: Seat,
    options: { exclude?: number } = {},
  ): Promise<void> {
    if (this.threatDeck.length === 0) {
      this.log(`${seat.getDisplayName()} - No threat cards remaining!`);
      throw new Error("Threat deck is empty!");
    }

    let threatCard: number;
    const exclude = options.exclude;

    do {
      if (this.threatDeck.length === 0) {
        this.log(
          `${seat.getDisplayName()} - No valid threat cards remaining!`,
        );
        throw new Error("Threat deck is empty!");
      }
      threatCard = this.threatDeck.shift()!;
    } while (exclude !== undefined && threatCard === exclude);

    seat.threatCard = threatCard;
    this.log(
      `${seat.getDisplayName()} draws threat card: ${threatCard}`,
      true,
    );
    this.notifyStateChange();
  }

  async chooseThreatCard(seat: Seat): Promise<void> {
    if (this.threatDeck.length === 0) {
      this.log(`${seat.getDisplayName()} - No threat cards available!`);
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
    this.log(
      `${seat.getDisplayName()} chooses threat card: ${choice.value}`,
      true,
    );
    this.notifyStateChange();
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

    this.log(
      `${fromSeat.getDisplayName()} gives ${cardFromFirst.value} of ${cardFromFirst.suit} to ${toSeat.getDisplayName()}`,
    );
    this.log(
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
      this.notifyStateChange();
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

  refreshDisplay(): void {
    this.notifyStateChange();
  }

  displaySimple(met: boolean, completable: boolean): { met: boolean; completable: boolean } {
    return { met, completable };
  }

  displayThreatCard(_seat: Seat, met: boolean, completable: boolean): { met: boolean; completable: boolean } {
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

    this.log(
      `${fromSeat.getDisplayName()} gives ${cardToGive.value} of ${cardToGive.suit} to ${toSeat.getDisplayName()}`,
    );
    this.notifyStateChange();
  }
}


// ===== GAME FUNCTIONS =====
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
        gameState.log(
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

  gameState.log(
    `${gameState.seats[playerIndex].getDisplayName()} plays ${card.value} of ${card.suit}`,
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
  return await controller.selectCard(legalMoves);
}

async function runTrickTakingPhase(gameState: Game): Promise<void> {
  gameState.log("=== PLAYING PHASE ===", true);

  while (!isGameOver(gameState)) {
    // === TRICK LOOP ===
    const trickLeader = gameState.leadPlayer;
    gameState.currentTrick = [];
    gameState.leadSuit = null;
    gameState.notifyStateChange();

    gameState.log(`--- Trick ${gameState.currentTrickNumber + 1} ---`);

    for (let i = 0; i < gameState.numCharacters; i++) {
      const playerIndex = (trickLeader + i) % gameState.numCharacters;

      if (gameState.seats[playerIndex].hand!.isEmpty()) {
        gameState.log(
          `${gameState.seats[playerIndex].getDisplayName()} passes (no cards)`,
        );
        continue;
      }

      gameState.currentPlayer = playerIndex;
      gameState.notifyStateChange();

      const legalMoves = getLegalMoves(gameState, playerIndex);

      const selectedCard = await selectCardFromPlayer(
        gameState,
        playerIndex,
        legalMoves,
      );

      await playSelectedCard(gameState, playerIndex, selectedCard);
      gameState.notifyStateChange();
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
      gameState.notifyStateChange();
    }

    const winnerIndex = determineTrickWinner(gameState);

    // Store completed trick with plays and winner
    gameState.completedTricks.push({
      plays: [...gameState.currentTrick],
      winner: winnerIndex,
    });

    const trickCards = gameState.currentTrick.map((play) => play.card);
    gameState.seats[winnerIndex].addTrick(
      gameState.currentTrickNumber,
      trickCards,
    );
    gameState.currentTrickNumber++;
    gameState.lastTrickWinner = winnerIndex;

    gameState.log(
      `${gameState.seats[winnerIndex].getDisplayName()} wins the trick!`,
      true,
    );

    for (const seat of gameState.seats) {
      seat.hand!.onTrickComplete();
    }

    gameState.notifyStateChange();

    checkForImpossibleObjectives(gameState);

    gameState.leadPlayer = winnerIndex;
  }
}

async function runSetupPhase(gameState: Game): Promise<void> {
  gameState.log("=== SETUP PHASE ===", true);

  const setupContext: GameSetupContext = {
    frodoSeat: gameState.seats[gameState.leadPlayer] || null,
    exchangeMade: false,
  };

  for (let i = 0; i < gameState.numCharacters; i++) {
    const playerIndex = (gameState.leadPlayer + i) % gameState.numCharacters;

    gameState.currentPlayer = playerIndex;
    gameState.notifyStateChange();

    const seat = gameState.seats[playerIndex];
    await seat.characterDef!.setup(gameState, seat, setupContext);
    gameState.notifyStateChange();
  }
}

async function runCharacterAssignment(gameState: Game): Promise<void> {
  gameState.log("=== CHARACTER ASSIGNMENT ===", true);

  const startPlayer = gameState.leadPlayer; // Player with 1 of Rings

  gameState.log(
    `${gameState.seats[startPlayer].getDisplayName()} gets Frodo (has 1 of Rings)`,
    true,
  );
  gameState.seats[startPlayer].character = "Frodo";
  gameState.seats[startPlayer].characterDef = characterRegistry.get("Frodo")!;
  gameState.availableCharacters = gameState.availableCharacters.filter(
    (c) => c !== "Frodo",
  );
  gameState.notifyStateChange();

  if (gameState.playerCount === 2) {
    const pyramid = gameState.seats.find((s) => s.controller instanceof ProxyController)!;
    let pyramidControllerIndex: number;

    if (startPlayer === pyramid.seatIndex) {
      pyramidControllerIndex = (startPlayer + 2) % 3;
    } else {
      pyramidControllerIndex = startPlayer;
    }

    (gameState.seats[pyramid.seatIndex].controller as ProxyController).setController( gameState.seats[pyramidControllerIndex].controller);

    gameState.log(
      `Pyramid will be controlled by ${gameState.seats[pyramidControllerIndex].getDisplayName()}`,
      true,
    );
    gameState.notifyStateChange();
  }

  for (let i = 1; i < gameState.numCharacters; i++) {
    const playerIndex = (startPlayer + i) % gameState.numCharacters;

    gameState.currentPlayer = playerIndex;
    gameState.notifyStateChange();

    const buttons: ChoiceButton<string>[] = gameState.availableCharacters.map(
      (char) => ({
        label: char,
        value: char,
      }),
    );

    const character = await gameState.seats[
      playerIndex
    ].controller.chooseButton({
      title: `${gameState.seats[playerIndex].getDisplayName()} - Choose Your Character`,
      message: "Select a character to play as",
      buttons,
    });

    gameState.log(
      `${gameState.seats[playerIndex].getDisplayName()} chose ${character}`,
    );
    const seat = gameState.seats[playerIndex];
    seat.character = character;
    seat.characterDef = characterRegistry.get(seat.character)!;
    gameState.availableCharacters = gameState.availableCharacters.filter(
      (c) => c !== character,
    );

    gameState.notifyStateChange();
  }
}

export async function runGame(gameState: Game): Promise<void> {
  gameState.notifyStateChange();

  const lostCard = gameState.lostCard!;

  gameState.log("=== NEW GAME STARTED ===", true);
  gameState.log(`Lost card: ${lostCard.value} of ${lostCard.suit}`);

  await runCharacterAssignment(gameState);
  await runSetupPhase(gameState);
  await runTrickTakingPhase(gameState);

  const gameOverMsg = getGameOverMessage(gameState);
  gameState.log("--- GAME OVER ---", true);
  gameState.log(gameOverMsg.split("\n").join(" | "));
  gameState.notifyStateChange();
}

// ===== END NEW GAME LOOP FUNCTIONS =====
