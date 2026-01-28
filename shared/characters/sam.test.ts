import { describe, expect, test } from "bun:test";
import { Sam } from "./sam";
import { GameStateBuilder } from "../test-utils";

describe("Sam", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no threat card assigned", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam")
        .build();

      expect(Sam.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when threat card assigned but not won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam")
        .build();

      seats[0]!.threatCard = 5;

      expect(Sam.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when different hills card won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam")
        .seatWonCards(0, [{ suit: "hills", value: 3 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(Sam.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when matching hills card won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam")
        .seatWonCards(0, [{ suit: "hills", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(Sam.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when matching hills card is among other cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "hills", value: 3 },
          { suit: "shadows", value: 7 },
        ])
        .build();

      seats[0]!.threatCard = 3;

      expect(Sam.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("ignores non-hills cards with matching value", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam")
        .seatWonCards(0, [
          { suit: "mountains", value: 5 },
          { suit: "shadows", value: 5 },
          { suit: "forests", value: 5 },
        ])
        .build();

      seats[0]!.threatCard = 5;

      expect(Sam.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when another player has won the threat card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam")
        .seatWonCards(1, [{ suit: "hills", value: 5 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(Sam.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when another player won a different hills card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Sam")
        .seatWonCards(1, [{ suit: "hills", value: 3 }])
        .build();

      seats[0]!.threatCard = 5;

      expect(Sam.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Sam.name).toBe("Sam");
    });

    test("has correct setupText", () => {
      expect(Sam.setupText).toBe(
        "Draw a Hills threat card, then exchange with Frodo, Merry, or Pippin"
      );
    });
  });
});
