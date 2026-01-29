import { describe, expect, test } from "bun:test";
import { BlackBreath } from "./black-breath";
import { GameStateBuilder } from "../test-utils";

describe("The Black Breath", () => {
  describe("objective.getStatus", () => {
    test("tentative success when no tricks won yet", () => {
      const { game, seats } = new GameStateBuilder(4).build();

      expect(BlackBreath.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("tentative success when tricks won but no 8s", () => {
      const { game, seats } = new GameStateBuilder(4)
        .seatWonTrick(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 5 },
          { suit: "forests", value: 7 },
          { suit: "hills", value: 3 },
        ])
        .build();

      expect(BlackBreath.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("final failure when a single rank 8 card is won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .seatWonCards(0, [{ suit: "mountains", value: 8 }])
        .build();

      expect(BlackBreath.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("final failure when multiple rank 8 cards are won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .seatWonCards(0, [
          { suit: "mountains", value: 8 },
          { suit: "shadows", value: 8 },
        ])
        .build();

      expect(BlackBreath.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("final success when game finished without winning any 8s", () => {
      // Give seat 1 all the 8s so seat 0 definitely won't have any
      const { game, seats } = new GameStateBuilder(4)
        .seatWonCards(1, [
          { suit: "mountains", value: 8 },
          { suit: "shadows", value: 8 },
          { suit: "forests", value: 8 },
          { suit: "hills", value: 8 },
        ])
        .finishGame()
        .build();

      expect(BlackBreath.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("failure applies only to the seat that won the 8", () => {
      const { game, seats } = new GameStateBuilder(4)
        .seatWonCards(1, [{ suit: "mountains", value: 8 }]) // Seat 1 won an 8
        .build();

      // Seat 0 should still be tentative success
      expect(BlackBreath.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });

      // Seat 1 should be final failure
      expect(BlackBreath.objective.getStatus(game, seats[1]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("display.getObjectiveCards", () => {
    test("returns empty array when no 8s won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .seatWonTrick(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 3 },
          { suit: "hills", value: 4 },
        ])
        .build();

      const result = BlackBreath.display.getObjectiveCards!(game, seats[0]!);
      expect(result.cards).toEqual([]);
    });

    test("returns won 8s", () => {
      const { game, seats } = new GameStateBuilder(4)
        .seatWonTrick(0, [
          { suit: "mountains", value: 8 },
          { suit: "forests", value: 3 },
          { suit: "shadows", value: 8 },
          { suit: "hills", value: 1 },
        ])
        .build();

      const result = BlackBreath.display.getObjectiveCards!(game, seats[0]!);
      expect(result.cards).toHaveLength(2);
      expect(result.cards).toContainEqual({ suit: "mountains", value: 8 });
      expect(result.cards).toContainEqual({ suit: "shadows", value: 8 });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(BlackBreath.name).toBe("The Black Breath");
    });

    test("has correct objective text", () => {
      expect(BlackBreath.objective.text).toBe("Win no rank 8 cards");
    });
  });
});
