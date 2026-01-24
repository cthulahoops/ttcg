import type { ObjectiveCard, ObjectiveStatus } from "../types";
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

    getStatus: (game, seat): ObjectiveStatus => {
      const trickCount = seat.getTrickCount();
      const hasOneRing = game.hasCard(seat, "rings", 1);
      const met = trickCount >= 3 && !hasOneRing;

      // Impossible if already has 1 of Rings
      if (hasOneRing) {
        return { finality: "final", outcome: "failure" };
      }

      // Impossible if not enough tricks remaining to reach 3
      const maxPossible = trickCount + game.tricksRemaining();
      if (maxPossible < 3) {
        return { finality: "final", outcome: "failure" };
      }

      // Can be completed early if objective is met AND 1 of Rings is already won by someone else
      if (met && (game.finished || game.cardGone(seat, "rings", 1))) {
        return { finality: "final", outcome: "success" };
      }

      return {
        finality: "tentative",
        outcome: met ? "success" : "failure",
      };
    },

    getDetails: (game, seat): string => {
      const trickCount = seat.getTrickCount();
      const hasOneRing = game.hasCard(seat, "rings", 1);

      const tricksIcon = trickCount >= 3 ? "✓" : `${trickCount}/3`;
      const oneRingIcon = hasOneRing ? "✗ (has 1-Ring)" : "✓";
      return `Tricks: ${tricksIcon}, 1-Ring: ${oneRingIcon}`;
    },
  },

  display: {
    getObjectiveCards: (_game, seat) => {
      const cards: ObjectiveCard[] = Array(seat.getTrickCount()).fill("trick");
      return { cards };
    },
  },
};
