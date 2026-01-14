import type { Card, Suit } from "../types";
import type { CharacterDefinition } from "./types";

export const TomBombadil: CharacterDefinition = {
  name: "Tom Bombadil",
  setupText: "Take the lost card, then exchange with Frodo",

  setup: async (game, seat, setupContext) => {
    await game.takeLostCard(seat);
    await game.exchange(seat, setupContext, (c: string) => c === "Frodo");
  },

  objective: {
    text: "Win 3 or more cards matching the suit of a card left in hand at the end of round",
    check: (_game, seat) => {
      const cardsInHand = seat.hand!.getAvailableCards();
      if (cardsInHand.length === 0) return false;

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

      for (const card of cardsInHand) {
        if (wonBySuit[card.suit] >= 3) {
          return true;
        }
      }

      return false;
    },
    isCompletable: (game, _seat) => {
      if (game.finished) {
        return TomBombadil.objective.check(game, _seat);
      }

      // TODO: Implement proper completability check
      // (need to check if we can still win 3+ cards of suits in hand)
      return true;
    },
    isCompleted: (game, seat) =>
      game.finished && TomBombadil.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = TomBombadil.objective.check(game, seat);
      const completable = TomBombadil.objective.isCompletable(game, seat);
      const completed = TomBombadil.objective.isCompleted(game, seat);

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

      return {
        met,
        completable,
        completed,
        details: countsDisplay || undefined,
      };
    },
  },
};
