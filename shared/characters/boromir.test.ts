import { describe, expect, test } from "bun:test";
import { Boromir } from "./boromir";
import { GameStateBuilder } from "../test-utils";

describe("Boromir", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks have been played (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .build();

      // No tricks played yet, last trick hasn't happened
      expect(Boromir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when some tricks played but not the last", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .seatWonTricks(0, 2) // Boromir won tricks 0 and 1, not the last trick (8)
        .build();

      expect(Boromir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when Boromir has 1 of Rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .build();

      // Even though last trick hasn't been played, having the 1 of Rings is final failure
      expect(Boromir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when Boromir won the last trick without 1 of Rings (game finished)", () => {
      // With finishGame(), seat 0 wins tricks 0, 4, 8 (last trick is 8)
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(Boromir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when game finished but Boromir did not win last trick", () => {
      // With finishGame(), seat 1 wins tricks 1, 5 (not 8)
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(1, "Boromir")
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(Boromir.objective.getStatus(game, seats[1]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when Boromir won the last trick but has 1 of Rings (game finished)", () => {
      // Seat 0 wins tricks including the last, but also has the 1 of Rings
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(Boromir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("works correctly for different seat indices", () => {
      // Seat 2 wins tricks 2, 6 with finishGame() - not the last trick (8)
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(2, "Boromir")
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(Boromir.objective.getStatus(game, seats[2]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Boromir.name).toBe("Boromir");
    });

    test("has correct setupText", () => {
      expect(Boromir.setupText).toBe("Exchange with anyone except Frodo");
    });

    test("has correct objective text", () => {
      expect(Boromir.objective.text).toBe(
        "Win the last trick; do NOT win the 1 of Rings"
      );
    });
  });
});
