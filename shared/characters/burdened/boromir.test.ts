import { describe, expect, test } from "bun:test";
import { BoromirBurdened } from "./boromir";
import { GameStateBuilder } from "../../test-utils";

describe("Boromir (Burdened)", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks have been played", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir (Burdened)")
        .build();

      expect(BoromirBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when some tricks played but not the last", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir (Burdened)")
        .seatWonTricks(0, 2)
        .build();

      expect(BoromirBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when Boromir has any rings card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir (Burdened)")
        .seatWonCards(0, [{ suit: "rings", value: 3 }])
        .build();

      expect(BoromirBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when Boromir has the 1 of Rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir (Burdened)")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .build();

      expect(BoromirBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when game finished, won last trick, no rings", () => {
      // Place all rings cards in other seats so seat 0 has none.
      // Explicitly assign all 9 tricks so the last trick (trick 8) goes to seat 0.
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir (Burdened)")
        .seatWonTrick(1, [
          { suit: "rings", value: 1 },
          { suit: "rings", value: 2 },
          { suit: "rings", value: 3 },
          { suit: "rings", value: 4 },
        ])
        .seatWonTrick(2, [{ suit: "rings", value: 5 }])
        .seatWonTrick(3, [{ suit: "mountains", value: 2 }])
        .seatWonTrick(1, [{ suit: "mountains", value: 3 }])
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .seatWonTricks(0, 1) // seat 0 wins the last trick (trick 8)
        .build();

      expect(game.finished).toBe(true);
      expect(BoromirBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when game finished but did not win last trick", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(1, "Boromir (Burdened)")
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(BoromirBurdened.objective.getStatus(game, seats[1]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished, won last trick but has a rings card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir (Burdened)")
        .seatWonCards(0, [{ suit: "rings", value: 2 }])
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(BoromirBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when Boromir has multiple rings cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Boromir (Burdened)")
        .seatWonCards(0, [
          { suit: "rings", value: 2 },
          { suit: "rings", value: 4 },
        ])
        .build();

      expect(BoromirBurdened.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(BoromirBurdened.name).toBe("Boromir (Burdened)");
    });

    test("has correct setupText", () => {
      expect(BoromirBurdened.setupText).toBe(
        "Exchange with anyone except Frodo"
      );
    });

    test("has correct objective text", () => {
      expect(BoromirBurdened.objective.text).toBe(
        "Win the last trick; do NOT win any ring cards"
      );
    });
  });
});
