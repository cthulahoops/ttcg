import { describe, expect, test } from "bun:test";
import { AragornBurdened } from "./aragorn";
import { GameStateBuilder } from "../../test-utils";

describe("Aragorn (Burdened)", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no threat card set", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn (Burdened)")
        .build();

      seats[0]!.threatCard = null;
      expect(AragornBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when trick count equals threat card (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn (Burdened)")
        .seatWonTricks(0, 2)
        .build();

      seats[0]!.threatCard = 2;
      expect(AragornBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when game finished and trick count equals threat card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn (Burdened)")
        .seatWonTricks(0, 2)
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      seats[0]!.threatCard = 2;
      expect(game.finished).toBe(true);
      expect(AragornBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when already over target", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn (Burdened)")
        .seatWonTricks(0, 3)
        .build();

      seats[0]!.threatCard = 2;
      expect(AragornBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when not enough tricks remain to reach target", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn (Burdened)")
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .build();

      game.currentTrickNumber = 7; // tricksRemaining = 9 - 7 = 2
      seats[0]!.threatCard = 8;
      expect(AragornBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished but below target", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn (Burdened)")
        .seatWonTricks(0, 2)
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      seats[0]!.threatCard = 5;
      expect(game.finished).toBe(true);
      expect(AragornBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when below target but tricks remain", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn (Burdened)")
        .seatWonTricks(0, 1)
        .build();

      seats[0]!.threatCard = 3;
      expect(AragornBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(AragornBurdened.name).toBe("Aragorn (Burdened)");
    });

    test("has correct setupText", () => {
      expect(AragornBurdened.setupText).toBe(
        "Draw and choose from 2 threat cards, then exchange with anyone"
      );
    });

    test("has correct objective text", () => {
      expect(AragornBurdened.objective.text).toBe(
        "Win exactly the number of tricks shown on your threat card"
      );
    });
  });
});
