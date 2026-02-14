import { describe, expect, test } from "bun:test";
import { PippinBurdened } from "./pippin";
import { GameStateBuilder } from "../../test-utils";

describe("Pippin (Burdened)", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks won and others also have 0 (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin (Burdened)")
        .build();

      // All have 0 tricks - "all others win at least 1" is currently not met
      expect(PippinBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when Pippin has won any trick", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin (Burdened)")
        .seatWonTricks(0, 1)
        .build();

      expect(PippinBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when Pippin has 0 tricks and others have >= 1", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin (Burdened)")
        .seatWonTricks(1, 1)
        .seatWonTricks(2, 1)
        .seatWonTricks(3, 1)
        .build();

      expect(PippinBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when game finished with 0 tricks and all others >= 1", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin (Burdened)")
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 3)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(0);
      expect(PippinBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when game finished with 0 tricks but another player has 0", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin (Burdened)")
        .seatWonTricks(1, 5)
        .seatWonTricks(2, 4)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(0);
      expect(seats[3]!.getTrickCount()).toBe(0);
      expect(PippinBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished with 1 trick", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin (Burdened)")
        .seatWonTricks(0, 1)
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(1);
      expect(PippinBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when Pippin has 0 but not all others have >= 1 yet", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Pippin (Burdened)")
        .seatWonTricks(1, 2)
        .build();

      // Seats 2 and 3 have 0 tricks - game not finished, so they might still win some
      expect(PippinBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(PippinBurdened.name).toBe("Pippin (Burdened)");
    });

    test("has correct setupText", () => {
      expect(PippinBurdened.setupText).toBe("Exchange with anyone");
    });

    test("has correct objective text", () => {
      expect(PippinBurdened.objective.text).toBe(
        "Win no tricks; all others win at least 1"
      );
    });
  });
});
