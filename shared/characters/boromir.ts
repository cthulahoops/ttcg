import type { CharacterDefinition } from "./types";

export const Boromir: CharacterDefinition = {
  name: "Boromir",
  setupText: "Exchange with anyone except Frodo",

  setup: async (game, seat, setupContext) => {
    await game.exchange(seat, setupContext, (c: string) => c !== "Frodo");
  },

  objective: {
    text: "Win the last trick; do NOT win the 1 of Rings",
    check: (game, seat) => {
      const wonLast = game.lastTrickWinner === seat.seatIndex;
      const hasOneRing = game.hasCard(seat, "rings", 1);
      return wonLast && !hasOneRing;
    },
    isCompletable: (game, seat) => !game.hasCard(seat, "rings", 1),
    isCompleted: (game, seat) => game.finished && Boromir.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const wonLast = game.lastTrickWinner === seat.seatIndex;
      const hasOneRing = game.hasCard(seat, "rings", 1);
      const met = Boromir.objective.check(game, seat);
      const completable = Boromir.objective.isCompletable(game, seat);
      const completed = Boromir.objective.isCompleted(game, seat);

      const lastIcon = wonLast ? "✓" : "✗";
      const oneRingIcon = hasOneRing ? "✗ (has 1-Ring)" : "✓";
      const details = `Last: ${lastIcon}, 1-Ring: ${oneRingIcon}`;

      return { met, completable, completed, details };
    },
  },
};
