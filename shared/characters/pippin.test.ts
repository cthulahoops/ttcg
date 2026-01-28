import { describe, expect, test } from "bun:test";
import { Pippin } from "./pippin";
import { GameStateBuilder } from "../test-utils";

describe("Pippin", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, success } when tied for fewest with 0 tricks (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin")
        .build();

      // All players have 0 tricks - Pippin is tied for fewest
      expect(Pippin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when alone with fewest tricks", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin")
        .seatWonTricks(1, 1)
        .seatWonTricks(2, 1)
        .seatWonTricks(3, 1)
        .build();

      // Pippin has 0 tricks, others have 1 each
      expect(Pippin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { tentative, failure } when not tied for fewest", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin")
        .seatWonTricks(0, 2)
        .seatWonTricks(1, 1)
        .build();

      // Pippin has 2 tricks, seat 1 has 1 trick
      expect(Pippin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when gap exceeds remaining tricks", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin")
        .seatWonTricks(0, 2)
        .build();

      // Simulate most tricks have been played
      game.currentTrickNumber = 8; // Only 1 trick remaining (9-8=1)
      // Pippin has 2 tricks, everyone else has 0
      // Gap is (2-0) * 3 = 6, but only 1 trick remaining
      expect(Pippin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when game finished and tied for fewest", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin")
        .seatWonTricks(0, 2)
        .seatWonTricks(1, 2)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 3)
        .finishGame()
        .build();

      // All have same number of tricks (except seat 3), game finished
      expect(game.finished).toBe(true);
      expect(Pippin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when game finished but not tied for fewest", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin")
        .seatWonTricks(0, 3)
        .seatWonTricks(1, 2)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      // Pippin has 3 tricks, others have 2 each
      expect(game.finished).toBe(true);
      expect(Pippin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } early when guaranteed fewest (myMax <= othersMin)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin")
        .seatWonTricks(1, 2)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .build();

      game.currentTrickNumber = 7; // 2 tricks remaining (9-7=2)
      // Pippin has 0 tricks, others have 2 tricks each
      // myMax = 0 + 2 = 2
      // othersMin = 2
      // 2 <= 2, so guaranteed fewest (tied)
      expect(game.finished).toBe(false);
      expect(Pippin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when currently tied for fewest but not guaranteed (myMax > othersMin)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin")
        .seatWonTricks(0, 1)
        .seatWonTricks(1, 2)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .build();

      game.currentTrickNumber = 6; // 3 tricks remaining (9-6=3)
      // Pippin has 1 trick, others have 2 tricks each
      // Pippin is currently tied for fewest (1 is min)
      // myMax = 1 + 3 = 4
      // othersMin = 2
      // 4 > 2, so not guaranteed fewest, but currently met
      expect(game.finished).toBe(false);
      expect(Pippin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Pippin.name).toBe("Pippin");
    });

    test("has correct setupText", () => {
      expect(Pippin.setupText).toBe("Exchange with Frodo, Merry, or Sam");
    });
  });
});
