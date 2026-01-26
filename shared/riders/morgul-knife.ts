import type { RiderDefinition } from "./types";

export const MorgulKnife: RiderDefinition = {
  name: "Morgul-Knife",
  objective: {
    text: "Do not lead with a ring card",
    getStatus: (_game, _seat) => {
      // TODO: Implement
      return { finality: "tentative", outcome: "success" };
    },
  },
  display: {},
};
