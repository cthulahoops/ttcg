import type { CharacterDefinition } from "./types";

export const Legolas: CharacterDefinition = {
  name: "Legolas",
  setupText: "Draw a Forests threat card, then exchange with Gimli or Aragorn",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat, {
      exclude: game.lostCard?.value,
    });
    await game.exchange(seat, setupContext, (c: string) =>
      ["Gimli", "Aragorn"].includes(c),
    );
  },

  objective: {
    text: "Win the Forests card matching your threat card",
    check: (game, seat) => {
      if (!seat.threatCard) return false;
      return game.hasCard(seat, "forests", seat.threatCard);
    },
    isCompletable: (game, seat) => {
      if (!seat.threatCard) return true;
      return !game.cardGone(seat, "forests", seat.threatCard);
    },
    isCompleted: (game, seat) => Legolas.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      const met = Legolas.objective.check(game, seat);
      const completable = Legolas.objective.isCompletable(game, seat);
      return game.displayThreatCard(seat, met, completable);
    },
  },
};
