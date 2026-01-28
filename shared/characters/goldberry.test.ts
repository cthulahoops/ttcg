import { describe, expect, test } from "bun:test";
import { Goldberry } from "./goldberry";
import { GameStateBuilder } from "../test-utils";

describe("Goldberry", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Goldberry")
        .build();

      // Game is not finished (hands have cards)
      expect(game.finished).toBe(false);
      expect(Goldberry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when exactly 3 consecutive tricks won (game finished)", () => {
      // Seat 0 gets exactly 3 tricks (consecutive), other seats get remaining 6 tricks
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Goldberry")
        .seatWonTricks(0, 3)
        .seatWonTricks(1, 2)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      // Builder creates consecutive tricks (0, 1, 2) for seat 0
      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(3);
      expect(Goldberry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when more than 3 tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Goldberry")
        .seatWonTricks(0, 4)
        .build();

      expect(Goldberry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when 3 tricks won but not consecutive", () => {
      // Build game without won cards, then manually add non-consecutive tricks
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Goldberry")
        .build();

      // Manually add tricks with non-consecutive numbers (0, 1, 3 - skipping 2)
      seats[0]!.addTrick(0, [{ suit: "mountains", value: 2 }]);
      seats[0]!.addTrick(1, [{ suit: "shadows", value: 2 }]);
      seats[0]!.addTrick(3, [{ suit: "forests", value: 3 }]);

      expect(Goldberry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when sequence broken (missed a trick)", () => {
      // Build game without won cards, then manually add trick and set currentTrickNumber
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Goldberry")
        .build();

      // Add 1 trick at position 2, but game has moved past position 3
      seats[0]!.addTrick(2, [{ suit: "mountains", value: 2 }]);
      game.currentTrickNumber = 4; // Already past trick 3, sequence broken

      expect(Goldberry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when 2 consecutive tricks won and can continue", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Goldberry")
        .build();

      // Manually add 2 consecutive tricks at positions 3 and 4
      seats[0]!.addTrick(3, [{ suit: "mountains", value: 2 }]);
      seats[0]!.addTrick(4, [{ suit: "shadows", value: 2 }]);
      game.currentTrickNumber = 5; // Next trick is 5, continues sequence

      expect(Goldberry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when not enough tricks remaining", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Goldberry")
        .build();

      game.currentTrickNumber = 7; // Only 2 tricks remaining (7, 8)

      expect(Goldberry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Goldberry.name).toBe("Goldberry");
    });

    test("has correct setupText", () => {
      expect(Goldberry.setupText).toBe(
        "Turn your hand face-up (visible to all players)"
      );
    });

    test("has correct objective text", () => {
      expect(Goldberry.objective.text).toBe(
        "Win exactly three tricks in a row and no other tricks"
      );
    });
  });
});
