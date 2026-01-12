import { shuffleDeck } from "@shared/utils";
import { runGame, Game } from "@shared/game";

import { ProxyController, Controller } from "@shared/controllers";

import { Card, Suit } from "@shared/types";

import { Seat } from "@shared/seat";

import { SolitaireHand, PlayerHand, PyramidHand } from "@shared/hands";

import {
  characterRegistry,
  allCharacterNames,
} from "@shared/characters/registry";

// All possible characters in the game (except Frodo who is automatically assigned)
const allCharacters = allCharacterNames.filter((name) => name !== "Frodo");

export function newGame(controllers: Controller[]): Game {
  const playerCount = controllers.length;

  if (playerCount == 1) {
    controllers.push(controllers[0]);
    controllers.push(controllers[0]);
    controllers.push(controllers[0]);
  }

  let pyramidController;
  if (playerCount == 2) {
    pyramidController = new ProxyController();
    controllers.push(pyramidController);
  }

  shuffleDeck(controllers);

  const numCharacters = controllers.length;

  const cardsPerPlayer = 36 / numCharacters;

  //  document.body.setAttribute("data-player-count", playerCount.toString());

  let deck: Card[], lostCard: Card;

  do {
    deck = shuffleDeck(createDeck());
    lostCard = deck.shift()!;
  } while (lostCard.suit === "rings" && lostCard.value === 1);

  const playerCards: Card[][] = Array.from({ length: numCharacters }, () => []);
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < numCharacters; p++) {
      playerCards[p].push(deck.shift()!);
    }
  }

  const startPlayer = findPlayerWithCard(playerCards, {
    suit: "rings",
    value: 1,
  });

  const seats: Seat[] = [];
  for (let i = 0; i < numCharacters; i++) {
    const controller: Controller = controllers[i];

    const seat = new Seat(i, controller);

    if (playerCount === 1) {
      seat.hand = new SolitaireHand(playerCards[i]);
    } else if (controller === pyramidController) {
      seat.hand = new PyramidHand(playerCards[i]);
      seat.isPyramid = true;
    } else {
      // All normal hands use PlayerHand; hiding is handled by serialization
      seat.hand = new PlayerHand(playerCards[i]);
    }

    seats.push(seat);
  }

  const availableCharacters = shuffleDeck(allCharacters).slice(0, 4);
  availableCharacters.push("Frodo");

  const gameState = new Game(
    playerCount,
    numCharacters,
    seats,
    lostCard,
    startPlayer,
  );
  gameState.availableCharacters = availableCharacters;

  return gameState;
}

export function createDeck(): Card[] {
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
