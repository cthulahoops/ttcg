import { describe, expect, test } from "bun:test";
import { Elrond } from "./elrond";
import { GameStateBuilder } from "../test-utils";

describe("Elrond", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no one has won rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .build();

      expect(Elrond.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only some seats have won rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .seatWonCards(1, [{ suit: "rings", value: 2 }])
        .build();

      expect(Elrond.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when all but one seat has won rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .seatWonCards(1, [{ suit: "rings", value: 2 }])
        .seatWonCards(2, [{ suit: "rings", value: 3 }])
        .build();

      expect(Elrond.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when all seats have won at least one ring", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .seatWonCards(1, [{ suit: "rings", value: 2 }])
        .seatWonCards(2, [{ suit: "rings", value: 3 }])
        .seatWonCards(3, [{ suit: "rings", value: 4 }])
        .build();

      expect(Elrond.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } in 3-player game when all seats have rings", () => {
      const { game, seats } = new GameStateBuilder(3)
        .setCharacter(0, "Elrond")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .seatWonCards(1, [{ suit: "rings", value: 2 }])
        .seatWonCards(2, [{ suit: "rings", value: 3 }])
        .build();

      expect(Elrond.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when not enough rings remain for all seats needing them", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .seatWonCards(0, [
          { suit: "rings", value: 1 },
          { suit: "rings", value: 2 },
          { suit: "rings", value: 3 },
          { suit: "rings", value: 4 },
        ])
        .build();

      // Only 1 ring remains but 3 seats need them
      expect(Elrond.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when one player hoards all rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .seatWonCards(0, [
          { suit: "rings", value: 1 },
          { suit: "rings", value: 2 },
          { suit: "rings", value: 3 },
          { suit: "rings", value: 4 },
          { suit: "rings", value: 5 },
        ])
        .build();

      expect(Elrond.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows correct count when no seats have rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .build();

      expect(Elrond.objective.getDetails!(game, seats[0]!)).toBe(
        "Seats with rings: 0/4"
      );
    });

    test("shows correct count when some seats have rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .seatWonCards(2, [{ suit: "rings", value: 3 }])
        .build();

      expect(Elrond.objective.getDetails!(game, seats[0]!)).toBe(
        "Seats with rings: 2/4"
      );
    });

    test("shows correct count when all seats have rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .seatWonCards(1, [{ suit: "rings", value: 2 }])
        .seatWonCards(2, [{ suit: "rings", value: 3 }])
        .seatWonCards(3, [{ suit: "rings", value: 4 }])
        .build();

      expect(Elrond.objective.getDetails!(game, seats[0]!)).toBe(
        "Seats with rings: 4/4"
      );
    });

    test("shows correct count for 3-player game", () => {
      const { game, seats } = new GameStateBuilder(3)
        .setCharacter(0, "Elrond")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .build();

      expect(Elrond.objective.getDetails!(game, seats[0]!)).toBe(
        "Seats with rings: 1/3"
      );
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Elrond.name).toBe("Elrond");
    });

    test("has correct setupText", () => {
      expect(Elrond.setupText).toBe(
        "Everyone simultaneously passes 1 card to the right"
      );
    });

    test("has correct objective text", () => {
      expect(Elrond.objective.text).toBe(
        "Every character must win a ring card"
      );
    });
  });
});
