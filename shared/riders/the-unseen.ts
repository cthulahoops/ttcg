import type { Game } from "../game";
import type { Seat } from "../seat";
import type { RiderDefinition } from "./types";

export const TheUnseen: RiderDefinition = {
  name: "The Unseen",
  objective: {
    text: "Threat card is hidden from other players",
    getStatus: (_game: Game, seat: Seat) => {
      if (!seat.character?.drawsThreatCard) {
        return { finality: "final", outcome: "failure" };
      }
      return { finality: "final", outcome: "success" };
    },
  },
};
