import { describe, expect, test } from "bun:test";
import { Arwen } from "./arwen";
import { GameStateBuilder } from "../test-utils";

describe("Arwen", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no forests won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Arwen")
        .build();

      expect(Arwen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when has more forests than all others (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Arwen")
        .seatWonCards(0, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
        ])
        .build();

      expect(Arwen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when has more forests than all others (game finished)", () => {
      // Arwen has 3 forests, each other seat has 1-2, Arwen wins with most
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Arwen")
        .seatWonCards(0, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
          { suit: "forests", value: 3 },
        ])
        .seatWonCards(1, [{ suit: "forests", value: 4 }])
        .seatWonCards(2, [{ suit: "forests", value: 5 }])
        .seatWonCards(3, [
          { suit: "forests", value: 6 },
          { suit: "forests", value: 7 },
        ])
        // Assign the last forest to seat 1 to avoid it being distributed randomly
        .seatWonCards(1, [{ suit: "forests", value: 8 }])
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      // Arwen has 3, seat 1 has 2, seat 2 has 1, seat 3 has 2 - Arwen wins
      expect(Arwen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, failure } when tied for most forests (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Arwen")
        .seatWonCards(0, [{ suit: "forests", value: 1 }])
        .seatWonCards(1, [{ suit: "forests", value: 2 }])
        .build();

      expect(Arwen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when tied for most forests (game finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Arwen")
        .seatWonCards(0, [{ suit: "forests", value: 1 }])
        .seatWonCards(1, [{ suit: "forests", value: 2 }])
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(Arwen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when another player has more forests", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Arwen")
        .seatWonCards(0, [{ suit: "forests", value: 1 }])
        .seatWonCards(1, [
          { suit: "forests", value: 2 },
          { suit: "forests", value: 3 },
        ])
        .build();

      expect(Arwen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("ignores non-forests cards when counting", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Arwen")
        .seatWonCards(0, [
          { suit: "mountains", value: 1 },
          { suit: "shadows", value: 2 },
          { suit: "hills", value: 3 },
          { suit: "rings", value: 1 },
        ])
        .build();

      expect(Arwen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("counts forests across multiple tricks", () => {
      // Arwen has 3 forests across multiple tricks, distribute remaining forests to others
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Arwen")
        .seatWonCards(0, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
          { suit: "forests", value: 3 },
        ])
        .seatWonCards(1, [
          { suit: "forests", value: 4 },
          { suit: "forests", value: 5 },
        ])
        .seatWonCards(2, [
          { suit: "forests", value: 6 },
          { suit: "forests", value: 7 },
        ])
        .seatWonCards(3, [{ suit: "forests", value: 8 }])
        .finishGame()
        .build();

      // Arwen has 3, others have 2, 2, 1 - Arwen wins
      expect(Arwen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when others have too many forests to overtake", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Arwen")
        .seatWonCards(1, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
          { suit: "forests", value: 3 },
          { suit: "forests", value: 4 },
          { suit: "forests", value: 5 },
        ])
        .build();

      // Other has 5 forests, only 3 remain for Arwen - can't exceed 5
      expect(Arwen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when tied and no forests remain", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Arwen")
        .seatWonCards(0, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
          { suit: "forests", value: 3 },
          { suit: "forests", value: 4 },
        ])
        .seatWonCards(1, [
          { suit: "forests", value: 5 },
          { suit: "forests", value: 6 },
          { suit: "forests", value: 7 },
          { suit: "forests", value: 8 },
        ])
        .build();

      // Both have 4 forests, no remaining forests to break tie
      expect(Arwen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } early when guaranteed to have most forests", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Arwen")
        .seatWonCards(0, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
          { suit: "forests", value: 3 },
          { suit: "forests", value: 4 },
          { suit: "forests", value: 5 },
          { suit: "forests", value: 6 },
        ])
        .build();

      expect(game.finished).toBe(false);
      // Arwen has 6 forests, others have 0, only 2 forests remain
      // Others can at most get 2, so Arwen is guaranteed to have most
      expect(Arwen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when leading but not guaranteed", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Arwen")
        .seatWonCards(0, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
          { suit: "forests", value: 3 },
        ])
        .seatWonCards(1, [
          { suit: "forests", value: 4 },
          { suit: "forests", value: 5 },
        ])
        .build();

      expect(game.finished).toBe(false);
      // Arwen has 3, other has 2, 3 forests remain
      // Other could get all 3 and have 5, exceeding Arwen's 3
      expect(Arwen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } early with comfortable lead", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Arwen")
        .seatWonCards(0, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
          { suit: "forests", value: 3 },
          { suit: "forests", value: 4 },
          { suit: "forests", value: 5 },
        ])
        .seatWonCards(1, [{ suit: "forests", value: 6 }])
        .build();

      expect(game.finished).toBe(false);
      // Arwen has 5 forests, other has 1, 2 forests remain
      // Other could get 1+2=3, still less than 5
      expect(Arwen.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Arwen.name).toBe("Arwen");
    });

    test("has correct setupText", () => {
      expect(Arwen.setupText).toBe("Exchange with Elrond or Aragorn");
    });

    test("has correct objective text", () => {
      expect(Arwen.objective.text).toBe("Win the most forests cards");
    });
  });
});
