import type { CharacterDefinition } from "./types";

export const BilboBaggins: CharacterDefinition = {
  name: "Bilbo Baggins",
  setupText: "No setup action",

  setup: async (_game, _seat, _setupContext) => {
    // TODO: Implement "choose next leader" mechanic during trick-taking
    // When Bilbo wins a trick, he may choose who leads the next trick
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
      return !game.hasCard(seat, "rings", 1);
    },
  },

  display: {
    renderStatus: (game, seat) => {
      const trickCount = seat.getTrickCount();
      const hasOneRing = game.hasCard(seat, "rings", 1);
      const met = BilboBaggins.objective.check(game, seat);
      const completable = BilboBaggins.objective.isCompletable(game, seat);

      const tricksIcon = trickCount >= 3 ? "✓" : `${trickCount}/3`;
      const oneRingIcon = hasOneRing ? "✗ (has 1-Ring)" : "✓";
      const details = `Tricks: ${tricksIcon}, 1-Ring: ${oneRingIcon}`;

      return { met, completable, details };
    },
  },
};
