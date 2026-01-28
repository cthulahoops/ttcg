import { describe, expect, test } from "bun:test";
import { Legolas } from "./legolas";
import { GameStateBuilder } from "../test-utils";

describe("Legolas", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no threat card assigned", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Legolas")
        .build();

      expect(Legolas.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when threat card assigned but not won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Legolas")
        .build();

      seats[0]!.threatCard = 5;

      expect(Legolas.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when different forests card won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Legolas")
        .seatWonCards(0, [{ suit: "forests", value: 3 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(Legolas.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when matching forests card won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Legolas")
        .seatWonCards(0, [{ suit: "forests", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(Legolas.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when matching forests card is among other cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Legolas")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "forests", value: 3 },
          { suit: "shadows", value: 7 },
        ])
        .build();

      seats[0]!.threatCard = 3;

      expect(Legolas.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("ignores non-forests cards with matching value", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Legolas")
        .seatWonCards(0, [
          { suit: "mountains", value: 5 },
          { suit: "shadows", value: 5 },
          { suit: "hills", value: 5 },
        ])
        .build();

      seats[0]!.threatCard = 5;

      expect(Legolas.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when another player has won the threat card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Legolas")
        .seatWonCards(1, [{ suit: "forests", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(Legolas.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when another player won a different forests card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Legolas")
        .seatWonCards(1, [{ suit: "forests", value: 3 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(Legolas.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Legolas.name).toBe("Legolas");
    });

    test("has correct setupText", () => {
      expect(Legolas.setupText).toBe(
        "Draw a Forests threat card, then exchange with Gimli or Aragorn"
      );
    });

    test("has correct objective text", () => {
      expect(Legolas.objective.text).toBe(
        "Win the Forests card matching your threat card"
      );
    });
  });
});
