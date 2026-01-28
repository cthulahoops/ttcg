import type { ObjectiveCard, ObjectiveStatus } from "../types";
import type { CharacterDefinition } from "./types";
import {
  tricksWinnable,
  achieveAtLeast,
  achieveCard,
  doNot,
} from "shared/objectives";
import { achieveBoth } from "shared/objectives";

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
      return achieveBoth(
        achieveAtLeast(tricksWinnable(game, seat), 3),
        doNot(achieveCard(game, seat, "rings", 1))
      );
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
