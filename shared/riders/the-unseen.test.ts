import { describe, expect, test } from "bun:test";
import { TheUnseen } from "./the-unseen";
import { GameStateBuilder } from "../test-utils";
import { serializeGameForSeat } from "../serialize";

describe("The Unseen", () => {
  describe("objective.getStatus", () => {
    test("final success for characters that draw threat cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn")
        .build();

      expect(TheUnseen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("final failure for characters that do not draw threat cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Frodo")
        .build();

      expect(TheUnseen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("threat-card visibility", () => {
    test("logThreatCard shows details only to the assigned seat", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn")
        .build();
      const seat = seats[0]!;
      seat.rider = TheUnseen;

      const logs: Array<{
        line: string;
        important?: boolean;
        options?: { visibleTo?: number[]; hiddenMessage?: string };
      }> = [];
      game.onLog = (line, important, options) =>
        logs.push({ line, important, options });

      game.logThreatCard(seat, "draws", 6);

      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual({
        line: "Aragorn draws threat card: 6",
        important: true,
        options: {
          visibleTo: [0],
          hiddenMessage: "Aragorn draws a threat card",
        },
      });
    });

    test("serialize hides threat data from other seats until character objective is tentatively successful", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn")
        .build();
      const seat = seats[0]!;
      seat.rider = TheUnseen;
      seat.threatCard = 5; // Aragorn objective is currently failure

      const forOther = serializeGameForSeat(game, 1).seats[0]!;
      const forOwner = serializeGameForSeat(game, 0).seats[0]!;

      expect(forOther.threatCard).toBeNull();
      expect(forOther.objectiveCards).toBeUndefined();
      expect(forOwner.threatCard).toBe(5);
      expect(forOwner.objectiveCards).toBeDefined();
    });

    test("serialize reveals threat data to other seats once character objective is tentatively successful", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn")
        .seatWonTricks(0, 1)
        .build();
      const seat = seats[0]!;
      seat.rider = TheUnseen;
      seat.threatCard = 1; // Aragorn objective is now tentative success

      const forOther = serializeGameForSeat(game, 1).seats[0]!;

      expect(forOther.threatCard).toBe(1);
      expect(forOther.objectiveCards).toBeDefined();
    });
  });
});
