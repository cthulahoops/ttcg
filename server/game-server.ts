import {
     shuffleDeck
} from "../shared/utils.js";
import {
    runGame,
    Game
} from "../shared/game.js";

import {
    Controller
} from "../shared/controllers.js";

import {
    Card, Suit
} from "../shared/types.js";

import {
    Seat
} from "../shared/seat.js";

import {
    SolitaireHand, HiddenHand, PlayerHand, PyramidHand
} from "../shared/hands.js";

import { characterRegistry, allCharacterNames } from "../shared/characters/registry.js";

// All possible characters in the game (except Frodo who is automatically assigned)
const allCharacters = allCharacterNames.filter((name) => name !== "Frodo");

export function newGame(controllers: Controller[]): Game {
  const playerCount = controllers.length;

  let numCharacters: number;
  if (playerCount === 1) {
    numCharacters = 4;
  } else if (playerCount === 2) {
    numCharacters = 3;
  } else {
    numCharacters = playerCount;
  }
  const cardsPerPlayer = numCharacters === 3 ? 12 : 9;

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

  let pyramidPlayerIndex: number | null = null;
  if (playerCount === 2) {
    pyramidPlayerIndex = Math.random() < 0.5 ? 1 : 2;
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
    } else if (i === pyramidPlayerIndex) {
      seat.hand = new PyramidHand(playerCards[i]);
      seat.isPyramid = true;
    } else if (i === 0) {
      seat.hand = new PlayerHand(playerCards[i]);
    } else {
      seat.hand = new HiddenHand(playerCards[i]);
    }

    seats.push(seat);
  }

  const availableCharacters = shuffleDeck(allCharacters); // .slice(0, 4);
  availableCharacters.push("Frodo");

  const gameState = new Game(
    playerCount,
    numCharacters,
    seats,
    lostCard,
    startPlayer,
  );
  gameState.availableCharacters = availableCharacters;

  return gameState
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


