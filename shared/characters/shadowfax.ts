import type { Card } from "../types";
import type { CharacterDefinition } from "./types";

export const Shadowfax: CharacterDefinition = {
  name: "Shadowfax",
  setupText:
    "Set one card aside (may return it to hand at any point, must return if hand empty)",

  setup: async (_game, _seat, _setupContext) => {
    // TODO: Implement card aside mechanic
    // This requires tracking a "set aside" card that can be returned to hand
    // For now, no action taken
  },

  objective: {
    text: "Win at least two tricks containing a hills card",
    check: (_game, seat) => {
      const tricksWithHills = seat.tricksWon.filter(
        (trick: { number: number; cards: Card[] }) =>
          trick.cards.some((c) => c.suit === "hills"),
      );
      return tricksWithHills.length >= 2;
    },
    isCompletable: (_game, _seat) => {
      // Hard to determine without knowing remaining hills distribution
      // Simplified: always completable
      return true;
    },
    isCompleted: (game, seat) => Shadowfax.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const tricksWithHills = seat.tricksWon.filter(
        (trick: { number: number; cards: Card[] }) =>
          trick.cards.some((c) => c.suit === "hills"),
      );
      const met = Shadowfax.objective.check(game, seat);
      const completable = Shadowfax.objective.isCompletable(game, seat);
      const completed = Shadowfax.objective.isCompleted(game, seat);

      return {
        met,
        completable,
        completed,
        details: `Tricks with hills: ${tricksWithHills.length}/2`,
      };
    },
  },
};
