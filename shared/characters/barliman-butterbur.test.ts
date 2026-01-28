import { describe, expect, test } from "bun:test";
import { BarlimanButterbur } from "./barliman-butterbur";
import { GameStateBuilder } from "../test-utils";

describe("BarlimanButterbur", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Barliman Butterbur")
        .build();

      expect(BarlimanButterbur.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only won early tricks (before last 3)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Barliman Butterbur")
        .build();

      // tricksToPlay defaults to 9 for 4 players, so last 3 are tricks 6, 7, 8 (0-indexed)
      // Tricks 0-5 are "early"
      seats[0]!.addTrick(0, [{ suit: "mountains", value: 2 }]);
      seats[0]!.addTrick(3, [{ suit: "mountains", value: 3 }]);
      seats[0]!.addTrick(5, [{ suit: "mountains", value: 4 }]);

      expect(BarlimanButterbur.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when won the first of last 3 tricks", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Barliman Butterbur")
        .build();

      // tricksToPlay = 9, so trick 6 is the first of last 3 (9 - 3 = 6)
      seats[0]!.addTrick(6, [{ suit: "mountains", value: 2 }]);

      expect(BarlimanButterbur.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when won the second of last 3 tricks", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Barliman Butterbur")
        .build();

      seats[0]!.addTrick(7, [{ suit: "mountains", value: 2 }]);

      expect(BarlimanButterbur.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when won the last trick", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Barliman Butterbur")
        .build();

      // tricksToPlay = 9, so trick 8 is the last trick (0-indexed)
      seats[0]!.addTrick(8, [{ suit: "mountains", value: 2 }]);

      expect(BarlimanButterbur.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when won multiple of last 3 tricks", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Barliman Butterbur")
        .build();

      seats[0]!.addTrick(6, [{ suit: "mountains", value: 2 }]);
      seats[0]!.addTrick(8, [{ suit: "mountains", value: 3 }]);

      expect(BarlimanButterbur.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } even when also won early tricks", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Barliman Butterbur")
        .build();

      seats[0]!.addTrick(0, [{ suit: "mountains", value: 2 }]);
      seats[0]!.addTrick(3, [{ suit: "mountains", value: 3 }]);
      seats[0]!.addTrick(7, [{ suit: "mountains", value: 4 }]);

      expect(BarlimanButterbur.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("works correctly with 3-player game (12 tricks)", () => {
      const { game, seats } = new GameStateBuilder(3)
        .setCharacter(0, "Barliman Butterbur")
        .build();

      // tricksToPlay = 12 for 3 players, so last 3 are tricks 9, 10, 11

      // Trick 8 is not in last 3
      seats[0]!.addTrick(8, [{ suit: "mountains", value: 2 }]);
      expect(BarlimanButterbur.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });

      // Trick 9 is in last 3 (12 - 3 = 9)
      seats[0]!.addTrick(9, [{ suit: "mountains", value: 3 }]);
      expect(BarlimanButterbur.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when game finished but check fails", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Barliman Butterbur")
        .seatWonTricks(0, 1)
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      // The builder creates tricks starting at 0, so seat 0 has trick 0 (early, not in last 3)
      expect(game.finished).toBe(true);
      expect(BarlimanButterbur.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(BarlimanButterbur.name).toBe("Barliman Butterbur");
    });

    test("has correct setupText", () => {
      expect(BarlimanButterbur.setupText).toBe("Exchange with any player");
    });

    test("has correct objective text", () => {
      expect(BarlimanButterbur.objective.text).toBe(
        "Win at least one of the last three tricks"
      );
    });
  });
});
