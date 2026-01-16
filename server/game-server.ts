import { shuffleDeck } from "@shared/utils";
import { Game } from "@shared/game";

import { ProxyController, Controller } from "@shared/controllers";

import { Card } from "@shared/types";
import { Deck } from "@shared/deck";
import { Seat } from "@shared/seat";

import { SolitaireHand, PlayerHand, PyramidHand, Hand } from "@shared/hands";

import { allCharacterNames } from "@shared/characters/registry";

// All possible characters in the game (except Frodo who is automatically assigned)
const allCharacters = allCharacterNames.filter((name) => name !== "Frodo");

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

  const cardsPerPlayer = 36 / numCharacters;

  let deck: Deck, lostCard: Card;

  do {
    deck = new Deck();
    deck.shuffle();
    lostCard = deck.draw()!;
  } while (lostCard.suit === "rings" && lostCard.value === 1);

  const playerCards: Card[][] = Array.from({ length: numCharacters }, () => []);
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < numCharacters; p++) {
      playerCards[p]!.push(deck.draw()!);
    }
  }

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

  // Frodo + 1 spare per seat, so numCharacters non-Frodo characters + Frodo = numCharacters + 1 total
  const availableCharacters = shuffleDeck(allCharacters).slice(0, numCharacters);
  availableCharacters.push("Frodo");
  availableCharacters.sort();

  const gameState = new Game(playerCount, numCharacters, seats, lostCard, startPlayer);
  gameState.availableCharacters = availableCharacters;

  return gameState;
}

function createHand(cards: Card[], playerCount: number, isPyramid: boolean): Hand {
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
    hand.some((card) => card.suit === needle.suit && card.value === needle.value)
  );
  if (idx < 0) {
    throw new Error("Needle not found");
  }
  return idx;
}
