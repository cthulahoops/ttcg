import { describe, expect, test } from "bun:test";
import { Terror } from "./terror";
import { GameStateBuilder } from "../test-utils";

describe("Terror", () => {
  describe("objective.getStatus", () => {
    test("tentative success when no tricks led yet", () => {
      const { game, seats } = new GameStateBuilder(4).build();

      expect(Terror.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("final success when game finished without leading hills", () => {
      const { game, seats } = new GameStateBuilder(4).finishGame().build();

      // Game is finished, no completedTricks with hills leads
      expect(Terror.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("tentative success when led with non-hills card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .seatWonTrick(
          0,
          [
            { suit: "mountains", value: 2 },
            { suit: "shadows", value: 3 },
            { suit: "forests", value: 4 },
            { suit: "rings", value: 2 },
          ],
          { leader: 0 }
        )
        .build();

      expect(Terror.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("final failure when led with a hills card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .seatWonTrick(
          0,
          [
            { suit: "hills", value: 3 },
            { suit: "shadows", value: 3 },
            { suit: "forests", value: 4 },
            { suit: "rings", value: 2 },
          ],
          { leader: 0 }
        )
        .build();

      expect(Terror.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("failure only applies to the seat that led", () => {
      const { game, seats } = new GameStateBuilder(4)
        .seatWonTrick(
          1, // seat 1 won
          [
            { suit: "hills", value: 3 },
            { suit: "shadows", value: 3 },
            { suit: "forests", value: 4 },
            { suit: "rings", value: 2 },
          ],
          { leader: 1 } // seat 1 also led with hills
        )
        .build();

      // Seat 0 didn't lead with hills, should still be success
      expect(Terror.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });

      // Seat 1 led with hills, should be failure
      expect(Terror.objective.getStatus(game, seats[1]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Terror.name).toBe("Terror");
    });

    test("has correct objective text", () => {
      expect(Terror.objective.text).toBe("Do not lead with a hills card");
    });
  });
});
