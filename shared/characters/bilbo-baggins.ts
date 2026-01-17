import type { ObjectiveCard } from "../types";
import type { CharacterDefinition } from "./types";

export const BilboBaggins: CharacterDefinition = {
  name: "Bilbo Baggins",
  setupText: "No setup action",

  setup: async (_game, _seat, _setupContext) => {
    // No setup action - Bilbo's "choose next leader" ability is implemented
    // in runTrickTakingPhase when Bilbo wins a trick
  },

  objective: {
    text: "Win 3 or more tricks; do NOT win the 1 of Rings",
    check: (game, seat) => {
      const trickCount = seat.getTrickCount();
      const hasOneRing = game.hasCard(seat, "rings", 1);
      return trickCount >= 3 && !hasOneRing;
    },
    isCompletable: (game, seat) => {
      // Impossible if already has 1 of Rings
      if (game.hasCard(seat, "rings", 1)) {
        return false;
      }
      // Impossible if not enough tricks remaining to reach 3
      const tricksWon = seat.getTrickCount();
      const maxPossible = tricksWon + game.tricksRemaining();
      return maxPossible >= 3;
    },
    isCompleted: (game, seat) => {
      // Can be completed early if objective is met AND 1 of Rings is already won by someone else
      const met = BilboBaggins.objective.check(game, seat);
      if (!met) return false;
      // If game is finished, check is enough. Otherwise, need 1-ring to be gone.
      return game.finished || game.cardGone(seat, "rings", 1);
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const trickCount = seat.getTrickCount();
      const hasOneRing = game.hasCard(seat, "rings", 1);
      const met = BilboBaggins.objective.check(game, seat);
      const completable = BilboBaggins.objective.isCompletable(game, seat);
      const completed = BilboBaggins.objective.isCompleted(game, seat);

      const tricksIcon = trickCount >= 3 ? "✓" : `${trickCount}/3`;
      const oneRingIcon = hasOneRing ? "✗ (has 1-Ring)" : "✓";
      const details = `Tricks: ${tricksIcon}, 1-Ring: ${oneRingIcon}`;

      return { met, completable, completed, details };
    },
    getObjectiveCards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
