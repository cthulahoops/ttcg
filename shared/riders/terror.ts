import type { RiderDefinition } from "./types";

export const Terror: RiderDefinition = {
  name: "Terror",
  objective: {
    text: "Do not lead with a hills card",
    getStatus: (_game, _seat) => {
      // TODO: Implement
      return { finality: "tentative", outcome: "success" };
    },
  },
  display: {},
};
