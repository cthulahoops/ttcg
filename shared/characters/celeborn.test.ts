import { describe, expect, test } from "bun:test";
import { Celeborn } from "./celeborn";
import { GameStateBuilder } from "../test-utils";

describe("Celeborn", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no cards won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .build();

      expect(Celeborn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game is finished and no rank has 3 cards", () => {
      // Seat 0 wins exactly 4 cards (2 of rank 2, 2 of rank 3), no rank has 3+
      // Give remaining 4 cards of ranks 2-3 to seat 1, finishGame distributes rest
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .seatWonTrick(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 3 },
          { suit: "hills", value: 3 },
        ])
        .seatWonTrick(1, [
          { suit: "forests", value: 2 },
          { suit: "hills", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 3 },
        ])
        .finishGame()
        .build();

      expect(Celeborn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when exactly 3 cards of same rank", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .seatWonCards(0, [
          { suit: "mountains", value: 5 },
          { suit: "shadows", value: 5 },
          { suit: "forests", value: 5 },
        ])
        .build();

      expect(Celeborn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when 4 cards of same rank", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .seatWonCards(0, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 3 },
          { suit: "forests", value: 3 },
          { suit: "hills", value: 3 },
        ])
        .build();

      expect(Celeborn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when one rank has 3+ even if others have fewer", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 2 },
          { suit: "hills", value: 7 },
          { suit: "mountains", value: 8 },
        ])
        .build();

      expect(Celeborn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("counts cards across multiple tricks", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .seatWonCards(0, [
          { suit: "mountains", value: 4 },
          { suit: "shadows", value: 4 },
          { suit: "forests", value: 4 },
        ])
        .build();

      expect(Celeborn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Celeborn.name).toBe("Celeborn");
    });

    test("has correct setupText", () => {
      expect(Celeborn.setupText).toBe("Exchange with any player");
    });

    test("has correct objective text", () => {
      expect(Celeborn.objective.text).toBe(
        "Win at least three cards of the same rank"
      );
    });
  });
});
