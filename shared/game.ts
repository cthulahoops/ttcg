import { Hand as _Hand } from "./hands";
import { shuffleDeck, sortHand, delay } from "./utils";
import { Seat } from "./seat";
import { ProxyController } from "./controllers";
import { characterRegistry } from "./characters/registry";
import type { Card, Suit, ThreatCard, ChoiceButton } from "./types";

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
  onLog?: (
    line: string,
    important?: boolean,
    options?: { visibleTo?: number[]; hiddenMessage?: string },
  ) => void;

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

  log(
    line: string,
    important?: boolean,
    options?: { visibleTo?: number[]; hiddenMessage?: string },
  ): void {
    this.onLog?.(line, important, options);
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
    this.log(`${seat.getDisplayName()}'s hand is now visible to all players`);
    seat.hand!.reveal();
    this.notifyStateChange();
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
        this.log(`${seat.getDisplayName()} - No valid threat cards remaining!`);
        throw new Error("Threat deck is empty!");
      }
      threatCard = this.threatDeck.shift()!;
    } while (exclude !== undefined && threatCard === exclude);

    seat.threatCard = threatCard;
    this.log(`${seat.getDisplayName()} draws threat card: ${threatCard}`, true);
    this.notifyStateChange();
  }

  async chooseThreatCard(seat: Seat): Promise<void> {
    if (this.threatDeck.length === 0) {
      this.log(`${seat.getDisplayName()} - No threat cards available!`);
      throw new Error("Threat deck is empty!");
    }

    const threatCards: ThreatCard[] = [...this.threatDeck]
      .sort((a, b) => a - b)
      .map((value) => ({
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
          ? validPlayers[0]!.character!
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
      const first = validPlayers[0];
      if (!first) return null;
      targetSeat = first;
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

      const chosen = this.seats[targetIndex];
      if (!chosen) return null;
      targetSeat = chosen;
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

    // Second player can choose from their hand plus the card they're receiving
    const availableTo = targetSeat.hand!.getAvailableCards();
    const isFrodoTo = targetSeat.character === "Frodo";
    const playableTo = isFrodoTo
      ? availableTo.filter(
          (card) => !(card.suit === "rings" && card.value === 1),
        )
      : availableTo;

    // Include the received card in the choices (can return it if desired)
    const choicesForSecond = [...playableTo, cardFromFirst];

    let messageTo = `Choose a card to give to ${seat.getDisplayName()}`;
    if (isFrodoTo) {
      messageTo += " (Frodo cannot give away the 1 of Rings)";
    }

    const cardFromSecond = await targetSeat.controller.chooseCard({
      title: `${targetSeat.character} - Exchange with ${seat.character}`,
      message: messageTo,
      cards: sortHand(choicesForSecond),
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

    // No-op if the same card is returned (second player returned what they received)
    const sameCard =
      cardFromFirst.suit === cardFromSecond.suit &&
      cardFromFirst.value === cardFromSecond.value;

    if (sameCard) {
      this.log(
        `${toSeat.getDisplayName()} returns the card to ${fromSeat.getDisplayName()}`,
      );
      return;
    }

    fromSeat.hand!.removeCard(cardFromFirst);
    toSeat.hand!.removeCard(cardFromSecond);

    fromSeat.hand!.addCard(cardFromSecond);
    toSeat.hand!.addCard(cardFromFirst);

    const participants = [fromSeat.seatIndex, toSeat.seatIndex];
    this.log(
      `${fromSeat.getDisplayName()} gives ${cardFromFirst.value} of ${cardFromFirst.suit} to ${toSeat.getDisplayName()}`,
      false,
      {
        visibleTo: participants,
        hiddenMessage: `${fromSeat.getDisplayName()} gives a card to ${toSeat.getDisplayName()}`,
      },
    );
    this.log(
      `${toSeat.getDisplayName()} gives ${cardFromSecond.value} of ${cardFromSecond.suit} to ${fromSeat.getDisplayName()}`,
      false,
      {
        visibleTo: participants,
        hiddenMessage: `${toSeat.getDisplayName()} gives a card to ${fromSeat.getDisplayName()}`,
      },
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

  displaySimple(
    met: boolean,
    completable: boolean,
    completed: boolean,
  ): { met: boolean; completable: boolean; completed: boolean } {
    return { met, completable, completed };
  }

  displayThreatCard(
    _seat: Seat,
    met: boolean,
    completable: boolean,
    completed: boolean,
  ): { met: boolean; completable: boolean; completed: boolean } {
    return this.displaySimple(met, completable, completed);
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
      false,
      {
        visibleTo: [fromSeat.seatIndex, toSeat.seatIndex],
        hiddenMessage: `${fromSeat.getDisplayName()} gives a card to ${toSeat.getDisplayName()}`,
      },
    );
    this.notifyStateChange();
  }
}

// ===== GAME FUNCTIONS =====
function isLegalMove(gameState: Game, seat: Seat, card: Card): boolean {
  const playerHand = seat.hand!.getAvailableCards();

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

function getLegalMoves(gameState: Game, seat: Seat): Card[] {
  const availableCards = seat.hand!.getAvailableCards();
  return availableCards.filter((card) => isLegalMove(gameState, seat, card));
}

// ===== EXCHANGE HELPER FUNCTIONS =====

function checkObjective(gameState: Game, seat: Seat): boolean {
  return seat.characterDef!.objective.check(gameState, seat);
}

function isObjectiveCompletable(gameState: Game, seat: Seat): boolean {
  return seat.characterDef!.objective.isCompletable(gameState, seat);
}

function isObjectiveCompleted(gameState: Game, seat: Seat): boolean {
  return seat.characterDef!.objective.isCompleted(gameState, seat);
}

function allObjectivesCompleted(gameState: Game): boolean {
  return gameState.seats.every((seat) => isObjectiveCompleted(gameState, seat));
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
      const seat = gameState.seats[p];
      return seat ? seat.getDisplayName() : `Player ${p}`;
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

  if (allObjectivesCompleted(gameState)) {
    return true;
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
    const firstPlay = gameState.currentTrick[0];
    if (!firstPlay) {
      throw new Error("Cannot determine trick winner: no plays in trick");
    }
    winningPlay = firstPlay;

    for (let i = 1; i < gameState.currentTrick.length; i++) {
      const play = gameState.currentTrick[i];
      if (
        play &&
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
  seat: Seat,
  card: Card,
): Promise<void> {
  seat.hand!.removeCard(card);
  seat.playedCards.push(card);
  gameState.currentTrick.push({
    playerIndex: seat.seatIndex,
    card,
    isTrump: false,
  });

  gameState.log(`${seat.getDisplayName()} plays ${card.value} of ${card.suit}`);

  if (gameState.currentTrick.length === 1) {
    gameState.leadSuit = card.suit;
  }

  if (card.suit === "rings") {
    gameState.ringsBroken = true;
  }
}

async function selectCardFromPlayer(
  gameState: Game,
  seat: Seat,
  legalMoves: Card[],
): Promise<Card> {
  gameState.currentPlayer = seat.seatIndex;
  return await seat.controller.selectCard(legalMoves);
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
      const seat = gameState.seats[playerIndex];
      if (!seat) {
        throw new Error(`Invalid seat index: ${playerIndex}`);
      }

      if (seat.hand!.isEmpty()) {
        gameState.log(`${seat.getDisplayName()} passes (no cards)`);
        continue;
      }

      gameState.currentPlayer = playerIndex;
      gameState.notifyStateChange();

      const legalMoves = getLegalMoves(gameState, seat);

      const selectedCard = await selectCardFromPlayer(
        gameState,
        seat,
        legalMoves,
      );

      await playSelectedCard(gameState, seat, selectedCard);
      gameState.notifyStateChange();
    }

    const oneRingPlay = gameState.currentTrick.find(
      (play) => play.card.suit === "rings" && play.card.value === 1,
    );

    if (oneRingPlay) {
      // Check if the 1 of Rings would already win without using trump
      // (isTrump is still false at this point, so determineTrickWinner gives us the non-trump result)
      const alreadyWinning =
        determineTrickWinner(gameState) === oneRingPlay.playerIndex;

      if (!alreadyWinning) {
        const oneRingSeat = gameState.seats[oneRingPlay.playerIndex];
        if (!oneRingSeat) {
          throw new Error(
            `Invalid seat for 1 of Rings player: ${oneRingPlay.playerIndex}`,
          );
        }
        const useTrump = await oneRingSeat.controller.chooseButton({
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
    }

    const winnerIndex = determineTrickWinner(gameState);
    const winnerSeat = gameState.seats[winnerIndex];
    if (!winnerSeat) {
      throw new Error(`Invalid winner seat index: ${winnerIndex}`);
    }

    // Store completed trick with plays and winner
    gameState.completedTricks.push({
      plays: [...gameState.currentTrick],
      winner: winnerIndex,
    });

    const trickCards = gameState.currentTrick.map((play) => play.card);
    winnerSeat.addTrick(gameState.currentTrickNumber, trickCards);
    gameState.currentTrickNumber++;
    gameState.lastTrickWinner = winnerIndex;

    gameState.log(`${winnerSeat.getDisplayName()} wins the trick!`, true);

    for (const seat of gameState.seats) {
      seat.hand!.onTrickComplete();
    }

    gameState.notifyStateChange();

    checkForImpossibleObjectives(gameState);

    if (allObjectivesCompleted(gameState)) {
      gameState.log("All objectives have been completed!", true);
    }

    // Bilbo Baggins ability: choose who leads next trick
    let nextLeader = winnerIndex;
    if (
      winnerSeat.character === "Bilbo Baggins" &&
      !isGameOver(gameState) // No need to choose if game is ending
    ) {
      // Build list of players who have cards to play
      const eligibleLeaders = gameState.seats.filter(
        (seat) => !seat.hand!.isEmpty() || seat.asideCard,
      );

      if (eligibleLeaders.length > 1) {
        // Offer choice only if there's more than one option
        const options = eligibleLeaders.map((seat) => ({
          label: seat.getDisplayName(),
          value: seat.seatIndex,
        }));

        nextLeader = await winnerSeat.controller.chooseButton({
          title: "Bilbo's Ability",
          message: "Choose who leads the next trick:",
          buttons: options,
        });

        if (nextLeader !== winnerIndex) {
          const chosenSeat = gameState.seats[nextLeader];
          gameState.log(
            `${winnerSeat.getDisplayName()} chooses ${chosenSeat?.getDisplayName()} to lead the next trick.`,
          );
        }
      }
    }

    gameState.leadPlayer = nextLeader;
  }
}

async function runSetupPhase(gameState: Game): Promise<void> {
  gameState.log("=== SETUP PHASE ===", true);

  const setupContext: GameSetupContext = {
    frodoSeat: gameState.seats[gameState.leadPlayer] ?? null,
    exchangeMade: false,
  };

  for (let i = 0; i < gameState.numCharacters; i++) {
    const playerIndex = (gameState.leadPlayer + i) % gameState.numCharacters;
    const seat = gameState.seats[playerIndex];
    if (!seat) {
      throw new Error(`Invalid seat index in setup phase: ${playerIndex}`);
    }

    gameState.currentPlayer = playerIndex;
    gameState.notifyStateChange();

    await seat.characterDef!.setup(gameState, seat, setupContext);
    gameState.notifyStateChange();
  }
}

async function runCharacterAssignment(gameState: Game): Promise<void> {
  gameState.log("=== CHARACTER ASSIGNMENT ===", true);

  const startPlayer = gameState.leadPlayer; // Player with 1 of Rings
  const frodoSeat = gameState.seats[startPlayer];
  if (!frodoSeat) {
    throw new Error(`Invalid start player seat index: ${startPlayer}`);
  }

  gameState.log(
    `${frodoSeat.getDisplayName()} gets Frodo (has 1 of Rings)`,
    true,
  );
  frodoSeat.character = "Frodo";
  frodoSeat.characterDef = characterRegistry.get("Frodo")!;
  gameState.availableCharacters = gameState.availableCharacters.filter(
    (c) => c !== "Frodo",
  );
  gameState.notifyStateChange();

  if (gameState.playerCount === 2) {
    const pyramid = gameState.seats.find(
      (s) => s.controller instanceof ProxyController,
    );
    if (!pyramid) {
      throw new Error("No pyramid seat found in 2-player game");
    }

    let pyramidControllerSeat: Seat;
    if (startPlayer === pyramid.seatIndex) {
      const controllerIndex = (startPlayer + 2) % 3;
      const seat = gameState.seats[controllerIndex];
      if (!seat) {
        throw new Error(
          `Invalid pyramid controller seat index: ${controllerIndex}`,
        );
      }
      pyramidControllerSeat = seat;
    } else {
      pyramidControllerSeat = frodoSeat;
    }

    (pyramid.controller as ProxyController).setController(
      pyramidControllerSeat.controller,
    );

    gameState.log(
      `Pyramid will be controlled by ${pyramidControllerSeat.getDisplayName()}`,
      true,
    );
    gameState.notifyStateChange();
  }

  for (let i = 1; i < gameState.numCharacters; i++) {
    const playerIndex = (startPlayer + i) % gameState.numCharacters;
    const seat = gameState.seats[playerIndex];
    if (!seat) {
      throw new Error(
        `Invalid seat index during character assignment: ${playerIndex}`,
      );
    }

    gameState.currentPlayer = playerIndex;
    gameState.notifyStateChange();

    const buttons: ChoiceButton<string>[] = gameState.availableCharacters.map(
      (char) => ({
        label: char,
        value: char,
      }),
    );

    const character = await seat.controller.chooseButton({
      title: `${seat.getDisplayName()} - Choose Your Character`,
      message: "Select a character to play as",
      buttons,
    });

    gameState.log(`${seat.getDisplayName()} chose ${character}`);
    seat.character = character;
    seat.characterDef = characterRegistry.get(character)!;
    gameState.availableCharacters = gameState.availableCharacters.filter(
      (c) => c !== character,
    );

    gameState.notifyStateChange();
  }

  // Clear available characters after assignment is complete
  gameState.availableCharacters = [];
  gameState.notifyStateChange();
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
