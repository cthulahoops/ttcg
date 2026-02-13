import type { RiderDefinition } from "./types";

export const TheUnseen: RiderDefinition = {
  name: "The Unseen",
  objective: {
    text: "Threat card is hidden from other players",
    getStatus: () => {
      return { finality: "final", outcome: "success" };
    },
  },
};
