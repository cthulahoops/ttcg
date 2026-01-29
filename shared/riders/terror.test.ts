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

    // Tests below require GameStateBuilder extension to track who led tricks
    // test("tentative success when led with non-hills card")
    // test("final failure when led with a hills card")
    // test("failure only applies to the seat that led")
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
