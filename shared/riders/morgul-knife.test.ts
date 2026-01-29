import { describe, expect, test } from "bun:test";
import { MorgulKnife } from "./morgul-knife";
import { GameStateBuilder } from "../test-utils";

describe("Morgul-Knife", () => {
  describe("objective.getStatus", () => {
    test("tentative success when no tricks led yet", () => {
      const { game, seats } = new GameStateBuilder(4).build();

      expect(MorgulKnife.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("final success when game finished without leading rings", () => {
      const { game, seats } = new GameStateBuilder(4).finishGame().build();

      // Game is finished, no completedTricks with ring leads
      expect(MorgulKnife.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    // Tests below require GameStateBuilder extension to track who led tricks
    // test("tentative success when led with non-ring card")
    // test("final failure when led with a ring card")
    // test("failure only applies to the seat that led")
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(MorgulKnife.name).toBe("Morgul-Knife");
    });

    test("has correct objective text", () => {
      expect(MorgulKnife.objective.text).toBe("Do not lead with a ring card");
    });
  });
});
