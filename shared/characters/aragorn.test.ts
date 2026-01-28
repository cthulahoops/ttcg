import { describe, expect, test } from "bun:test";
import { Aragorn } from "./aragorn";
import { GameStateBuilder } from "../test-utils";

describe("Aragorn", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no threat card set", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn")
        .build();

      seats[0]!.threatCard = null;
      expect(Aragorn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when trick count equals threat card (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn")
        .seatWonTricks(0, 2)
        .build();

      seats[0]!.threatCard = 2;
      expect(Aragorn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when game finished and trick count equals threat card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn")
        .seatWonTricks(0, 2)
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      seats[0]!.threatCard = 2;
      expect(game.finished).toBe(true);
      expect(Aragorn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when already over target", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn")
        .seatWonTricks(0, 3)
        .build();

      seats[0]!.threatCard = 2;
      expect(Aragorn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when not enough tricks remain to reach target", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn")
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .build();

      // No tricks won, need 8 more, but only 2 tricks remain
      game.currentTrickNumber = 7; // tricksRemaining = 9 - 7 = 2
      seats[0]!.threatCard = 8;
      expect(Aragorn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished but below target", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Aragorn")
        .seatWonTricks(0, 2)
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      seats[0]!.threatCard = 5;
      expect(game.finished).toBe(true);
      expect(Aragorn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Aragorn.name).toBe("Aragorn");
    });

    test("has correct setupText", () => {
      expect(Aragorn.setupText).toBe(
        "Choose a threat card, then exchange with Gimli or Legolas"
      );
    });

    test("has correct objective text", () => {
      expect(Aragorn.objective.text).toBe(
        "Win exactly the number of tricks shown on your threat card"
      );
    });
  });
});
