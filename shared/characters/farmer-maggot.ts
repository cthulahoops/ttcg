import type { Suit } from "../types";
import type { CharacterDefinition } from "./types";

export const FarmerMaggot: CharacterDefinition = {
  name: "Farmer Maggot",
  setupText: "Draw a Hills threat card, then exchange with Merry or Pippin",

  setup: async (game, seat, setupContext) => {
    await game.drawThreatCard(seat);
    await game.exchange(seat, setupContext, (c: string) =>
      ["Merry", "Pippin"].includes(c),
    );
  },

  objective: {
    text: "Win at least two cards matching the threat card rank",
    check: (_game, seat) => {
      if (!seat.threatCard) return false;
      const matchingCards = seat
        .getAllWonCards()
        .filter((c) => c.value === seat.threatCard);
      return matchingCards.length >= 2;
    },
    isCompletable: (game, seat) => {
      if (!seat.threatCard) return true;

      const matchingWon = seat
        .getAllWonCards()
        .filter((c) => c.value === seat.threatCard).length;

      let matchingAvailable = 0;
      const suits: Suit[] = [
        "mountains",
        "shadows",
        "forests",
        "hills",
        "rings",
      ];

      for (const suit of suits) {
        const maxValue = suit === "rings" ? 5 : 8;
        if (seat.threatCard <= maxValue) {
          if (!game.cardGone(seat, suit, seat.threatCard)) {
            matchingAvailable++;
          }
        }
      }

      return matchingWon + matchingAvailable >= 2;
    },
    isCompleted: (game, seat) => FarmerMaggot.objective.check(game, seat),
  },

  display: {
    renderStatus: (game, seat) => {
      if (!seat.threatCard) {
        return game.displaySimple(false, true, false);
      }

      const matchingCards = seat
        .getAllWonCards()
        .filter((c) => c.value === seat.threatCard);
      const met = FarmerMaggot.objective.check(game, seat);
      const completable = FarmerMaggot.objective.isCompletable(game, seat);
      const completed = FarmerMaggot.objective.isCompleted(game, seat);

      return {
        met,
        completable,
        completed,
        details: `Threat: ${seat.threatCard}, Won: ${matchingCards.length}/2`,
      };
    },
  },
};
