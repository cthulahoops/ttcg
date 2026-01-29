import {
  CARDS_PER_SUIT,
  type Card,
  type ObjectiveStatus,
  type Suit,
} from "../types";
import type { CharacterDefinition } from "./types";
import type { Game } from "../game";
import type { Seat } from "../seat";
import { achieveAtLeast, type ObjectivePossibilities } from "../objectives";

/**
 * Calculate suit-winning possibilities for Tom Bombadil's objective.
 * Unlike the standard cardsWinnable, this doesn't limit by tricks remaining
 * because multiple cards of the same suit can be won in a single trick.
 */
function suitCardsWinnable(
  game: Game,
  seat: Seat,
  suit: Suit
): ObjectivePossibilities {
  let current = 0;
  let remaining = 0;

  for (let value = 1; value <= CARDS_PER_SUIT[suit]; value++) {
    if (game.hasCard(seat, suit, value)) {
      current++;
    } else if (game.cardAvailable(suit, value)) {
      remaining++;
    }
  }

  return { current, max: current + remaining };
}

/**
 * Calculate the best suit possibility for Tom Bombadil's objective.
 * Returns the ObjectivePossibilities for the suit currently in hand
 * that has the best chance of reaching 3 won cards.
 */
function bestSuitInHandWinnable(
  game: Game,
  seat: Seat
): ObjectivePossibilities {
  const cardsInHand = seat.hand.getAvailableCards();

  if (cardsInHand.length === 0) {
    return { current: 0, max: 0 };
  }

  const suitsInHand = new Set(cardsInHand.map((c) => c.suit));

  let bestPossibilities: ObjectivePossibilities = { current: 0, max: 0 };

  for (const suit of suitsInHand) {
    const suitPossibilities = suitCardsWinnable(game, seat, suit);

    // Pick the suit with the best max (most potential to win 3)
    // If tied on max, prefer higher current count
    if (
      suitPossibilities.max > bestPossibilities.max ||
      (suitPossibilities.max === bestPossibilities.max &&
        suitPossibilities.current > bestPossibilities.current)
    ) {
      bestPossibilities = suitPossibilities;
    }
  }

  return bestPossibilities;
}

export const TomBombadil: CharacterDefinition = {
  name: "Tom Bombadil",
  setupText: "Take the lost card, then exchange with Frodo",

  setup: async (game, seat, setupContext) => {
    await game.takeLostCard(seat);
    await game.exchange(seat, setupContext, (c: string) => c === "Frodo");
  },

  objective: {
    text: "Win 3 or more cards matching the suit of a card left in hand at the end of round",

    getStatus: (game, seat): ObjectiveStatus => {
      const possibilities = bestSuitInHandWinnable(game, seat);
      const status = achieveAtLeast(possibilities, 3);

      // Tom's objective can only be finalized at game end for success,
      // because the card in hand might still be played
      if (!game.finished && status.outcome === "success") {
        return { finality: "tentative", outcome: "success" };
      }

      return status;
    },

    getDetails: (_game, seat): string | undefined => {
      const wonBySuit: Record<Suit, number> = {
        mountains: 0,
        shadows: 0,
        forests: 0,
        hills: 0,
        rings: 0,
      };

      seat.getAllWonCards().forEach((card: Card) => {
        wonBySuit[card.suit] = (wonBySuit[card.suit] || 0) + 1;
      });

      const suitSymbols: Record<Suit, string> = {
        mountains: "⛰️",
        shadows: "👁️",
        forests: "🌲",
        hills: "🏔️",
        rings: "💍",
      };

      const countsDisplay = (Object.keys(wonBySuit) as Suit[])
        .filter((suit) => wonBySuit[suit] >= 2)
        .map((suit) => `${suitSymbols[suit]}:${wonBySuit[suit]}`)
        .join(" ");

      return countsDisplay || undefined;
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const cardsInHand = seat.hand.getAvailableCards();
      const suitsInHand = new Set(cardsInHand.map((c) => c.suit));

      // Show won cards from suits still in hand
      const cards = seat
        .getAllWonCards()
        .filter((c: Card) => suitsInHand.has(c.suit))
        .sort((a, b) => {
          if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
          return a.value - b.value;
        });
      return { cards };
    },
  },
};
