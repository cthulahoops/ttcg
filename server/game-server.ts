import { shuffleDeck } from "@shared/utils";
import { Game } from "@shared/game";

import { ProxyController, Controller } from "@shared/controllers";

import { Card } from "@shared/types";
import { Deck } from "@shared/deck";
import { Seat } from "@shared/seat";

import { SolitaireHand, PlayerHand, PyramidHand, Hand } from "@shared/hands";

import {
  allCharacters,
  fellowshipCharacters,
  extraCharacters,
} from "@shared/characters/registry";
import type { CharacterDefinition } from "@shared/characters/registry";

export function newGame(controllers: Controller[]): Game {
  const playerCount = controllers.length;

  if (playerCount == 1) {
    const singleController = controllers[0]!;
    controllers.push(singleController);
    controllers.push(singleController);
    controllers.push(singleController);
  }

  let pyramidController;
  if (playerCount == 2) {
    pyramidController = new ProxyController();
    pyramidController.playerName = "Pyramid";
    controllers.push(pyramidController);
  }

  controllers = shuffleDeck(controllers);

  const numCharacters = controllers.length;

  const { lostCard, playerCards } = dealCards(numCharacters);

  const startPlayer = findPlayerWithCard(playerCards, {
    suit: "rings",
    value: 1,
  });

  const seats: Seat[] = [];
  for (let i = 0; i < numCharacters; i++) {
    const controller: Controller = controllers[i]!;

    const isPyramid = controller === pyramidController;

    const seat = new Seat(
      i,
      controller,
      createHand(playerCards[i]!, playerCount, isPyramid),
      isPyramid
    );

    seats.push(seat);
  }

  // Draw characters alternating between fellowship and extras
  // 3-seat: Frodo + 2 Fellowship + 1 Extra
  // 4-seat: Frodo + 2 Fellowship + 2 Extra
  const frodo = allCharacters.find((c) => c.name === "Frodo")!;
  const shuffledFellowship = shuffleDeck([...fellowshipCharacters]);
  const shuffledExtras = shuffleDeck([...extraCharacters]);

  const availableCharacters: CharacterDefinition[] = [frodo];
  for (let i = 0; i < numCharacters; i++) {
    if (i % 2 === 0) {
      // Fellowship on even indices (0, 2, ...)
      const char = shuffledFellowship.shift();
      if (char) availableCharacters.push(char);
    } else {
      // Extras on odd indices (1, 3, ...)
      const char = shuffledExtras.shift();
      if (char) availableCharacters.push(char);
    }
  }
  availableCharacters.sort((a, b) => a.name.localeCompare(b.name));

  const gameState = new Game(
    playerCount,
    numCharacters,
    seats,
    lostCard,
    startPlayer
  );
  gameState.availableCharacters = availableCharacters;

  return gameState;
}

function dealCards(numCharacters: number) {
  let deck: Deck, lostCard: Card;

  do {
    deck = new Deck();
    deck.shuffle();
    lostCard = deck.draw()!;
  } while (lostCard.suit === "rings" && lostCard.value === 1);

  // 37 cards = 1 lost + (12 * 3 players) or 1 lost + (9 * 4 players)
  // The deck size is chosen so exactly 1 lost card works for both modes
  const cardsPerPlayer = deck.length / numCharacters;

  const playerCards: Card[][] = Array.from({ length: numCharacters }, () => []);
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < numCharacters; p++) {
      playerCards[p]!.push(deck.draw()!);
    }
  }

  return {
    playerCards,
    lostCard,
  };
}

function createHand(
  cards: Card[],
  playerCount: number,
  isPyramid: boolean
): Hand {
  if (playerCount == 1) {
    return new SolitaireHand(cards);
  }
  if (isPyramid) {
    return new PyramidHand(cards);
  }
  return new PlayerHand(cards);
}

function findPlayerWithCard(hands: Card[][], needle: Card): number {
  const idx = hands.findIndex((hand: Card[]) =>
    hand.some(
      (card) => card.suit === needle.suit && card.value === needle.value
    )
  );
  if (idx < 0) {
    throw new Error("Needle not found");
  }
  return idx;
}
