import type { RiderDefinition } from "./types";

export const BlackBreath: RiderDefinition = {
  name: "The Black Breath",
  objective: {
    text: "Win no rank 8 cards",
    getStatus: (_game, _seat) => {
      // TODO: Implement
      return { finality: "tentative", outcome: "success" };
    },
  },
  display: {},
};
