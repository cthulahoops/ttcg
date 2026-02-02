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

    test("returns { final, failure } when a ring is the lost card and not enough rings remain", () => {
      // With ring-2 as lost card, only 4 rings available for 4 seats
      // If one seat wins 2 rings, only 2 remain for 3 seats needing them
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .withLostCard({ suit: "rings", value: 2 })
        .seatWonCards(0, [
          { suit: "rings", value: 1 },
          { suit: "rings", value: 3 },
        ])
        .build();

      // 4 rings total (one lost), 2 won by seat 0, 2 remaining for 3 seats
      expect(Elrond.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when ring is lost card but enough rings remain", () => {
      // With ring-5 as lost card, 4 rings available for 4 seats
      // No rings won yet, so 4 rings for 4 seats is still achievable
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .withLostCard({ suit: "rings", value: 5 })
        .build();

      expect(Elrond.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows all characters when no seats have rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .setCharacter(1, "Frodo")
        .setCharacter(2, "Sam")
        .setCharacter(3, "Merry")
        .build();

      expect(Elrond.objective.getDetails!(game, seats[0]!)).toBe(
        "Elrond, Frodo, Sam, and Merry yet to win rings"
      );
    });

    test("shows characters without rings when some have rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .setCharacter(1, "Frodo")
        .setCharacter(2, "Sam")
        .setCharacter(3, "Merry")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .seatWonCards(2, [{ suit: "rings", value: 3 }])
        .build();

      expect(Elrond.objective.getDetails!(game, seats[0]!)).toBe(
        "Frodo, and Merry yet to win rings"
      );
    });

    test("shows single character when only one lacks rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .setCharacter(1, "Frodo")
        .setCharacter(2, "Sam")
        .setCharacter(3, "Merry")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .seatWonCards(1, [{ suit: "rings", value: 2 }])
        .seatWonCards(2, [{ suit: "rings", value: 3 }])
        .build();

      expect(Elrond.objective.getDetails!(game, seats[0]!)).toBe(
        "Merry yet to win rings"
      );
    });

    test("returns undefined when all seats have rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Elrond")
        .setCharacter(1, "Frodo")
        .setCharacter(2, "Sam")
        .setCharacter(3, "Merry")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .seatWonCards(1, [{ suit: "rings", value: 2 }])
        .seatWonCards(2, [{ suit: "rings", value: 3 }])
        .seatWonCards(3, [{ suit: "rings", value: 4 }])
        .build();

      expect(Elrond.objective.getDetails!(game, seats[0]!)).toBeUndefined();
    });

    test("shows characters for 3-player game", () => {
      const { game, seats } = new GameStateBuilder(3)
        .setCharacter(0, "Elrond")
        .setCharacter(1, "Frodo")
        .setCharacter(2, "Sam")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .build();

      expect(Elrond.objective.getDetails!(game, seats[0]!)).toBe(
        "Frodo, and Sam yet to win rings"
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
