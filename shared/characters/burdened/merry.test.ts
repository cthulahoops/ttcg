import { describe, expect, test } from "bun:test";
import { MerryBurdened } from "./merry";
import { GameStateBuilder } from "../../test-utils";

describe("Merry (Burdened)", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry (Burdened)")
        .build();

      expect(MerryBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only 1 trick won (need exactly 2)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry (Burdened)")
        .seatWonTricks(0, 1)
        .build();

      expect(MerryBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when exactly 2 tricks won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry (Burdened)")
        .seatWonTricks(0, 2)
        .seatWonTricks(1, 1)
        .seatWonTricks(2, 1)
        .seatWonTricks(3, 1)
        .build();

      expect(MerryBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, failure } when 3 tricks won (over target)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry (Burdened)")
        .seatWonTricks(0, 3)
        .build();

      expect(MerryBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when game finished with exactly 2 tricks and all others >= 1", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry (Burdened)")
        .seatWonTricks(0, 2)
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(2);
      expect(MerryBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when game finished with exactly 2 tricks but another player has 0", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry (Burdened)")
        .seatWonTricks(0, 2)
        .seatWonTricks(1, 4)
        .seatWonTricks(2, 3)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(2);
      expect(seats[3]!.getTrickCount()).toBe(0);
      expect(MerryBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished with 0 tricks", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry (Burdened)")
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 3)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(0);
      expect(MerryBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished with 1 trick (need exactly 2)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry (Burdened)")
        .seatWonTricks(0, 1)
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(1);
      expect(MerryBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(MerryBurdened.name).toBe("Merry (Burdened)");
    });

    test("has correct setupText", () => {
      expect(MerryBurdened.setupText).toBe(
        "Exchange with Frodo, Sam, or Pippin (all threat draws this round may be redrawn)"
      );
    });

    test("has correct objective text", () => {
      expect(MerryBurdened.objective.text).toBe(
        "Win exactly 2 tricks; all others win at least 1"
      );
    });
  });
});
