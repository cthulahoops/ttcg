import { describe, expect, test } from "bun:test";
import { Shadowfax } from "./shadowfax";
import { GameStateBuilder } from "../test-utils";

describe("Shadowfax", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks have been won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Shadowfax")
        .build();

      expect(Shadowfax.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when won tricks have no hills cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Shadowfax")
        .seatWonCards(0, [
          { suit: "forests", value: 3 },
          { suit: "shadows", value: 2 },
        ])
        .build();

      expect(Shadowfax.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only 1 trick contains a hills card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Shadowfax")
        .seatWonCards(0, [{ suit: "hills", value: 4 }])
        .build();

      expect(Shadowfax.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when exactly 2 tricks contain hills cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Shadowfax")
        .seatWonCards(0, [
          { suit: "hills", value: 4 },
          { suit: "hills", value: 7 },
        ])
        .build();

      expect(Shadowfax.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when more than 2 tricks contain hills cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Shadowfax")
        .seatWonCards(0, [
          { suit: "hills", value: 1 },
          { suit: "hills", value: 2 },
          { suit: "hills", value: 3 },
        ])
        .build();

      expect(Shadowfax.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("counts multiple hills in one trick as one trick with hills", () => {
      // Use seatWonTrick to create a single trick with multiple hills cards
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Shadowfax")
        .seatWonTrick(0, [
          { suit: "hills", value: 1 },
          { suit: "hills", value: 2 },
          { suit: "hills", value: 3 },
        ])
        .build();

      // Multiple hills in one trick = 1 trick with hills = tentative failure (need 2)
      expect(Shadowfax.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished but objective not met", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Shadowfax")
        .seatWonCards(0, [{ suit: "hills", value: 1 }])
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(Shadowfax.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("objective.cards", () => {
    test("returns empty array when no tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Shadowfax")
        .build();

      const result = Shadowfax.objective.cards!(game, seats[0]!);
      expect(result.cards).toEqual([]);
    });

    test("returns empty array when won tricks have no hills cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Shadowfax")
        .seatWonCards(0, [
          { suit: "forests", value: 3 },
          { suit: "shadows", value: 2 },
        ])
        .build();

      const result = Shadowfax.objective.cards!(game, seats[0]!);
      expect(result.cards).toEqual([]);
    });

    test("returns 1 trick marker when 1 trick contains hills", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Shadowfax")
        .seatWonCards(0, [{ suit: "hills", value: 4 }])
        .build();

      const result = Shadowfax.objective.cards!(game, seats[0]!);
      expect(result.cards).toEqual(["trick"]);
    });

    test("returns 2 trick markers when 2 tricks contain hills", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Shadowfax")
        .seatWonCards(0, [
          { suit: "hills", value: 4 },
          { suit: "hills", value: 7 },
        ])
        .build();

      const result = Shadowfax.objective.cards!(game, seats[0]!);
      expect(result.cards).toEqual(["trick", "trick"]);
    });

    test("returns trick markers for each qualifying trick", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Shadowfax")
        .seatWonCards(0, [
          { suit: "hills", value: 1 },
          { suit: "hills", value: 2 },
          { suit: "hills", value: 3 },
        ])
        .build();

      // Each hills card is in a separate trick, so 3 trick markers
      const result = Shadowfax.objective.cards!(game, seats[0]!);
      expect(result.cards).toEqual(["trick", "trick", "trick"]);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Shadowfax.name).toBe("Shadowfax");
    });

    test("has correct setupText", () => {
      expect(Shadowfax.setupText).toBe(
        "Set one card aside (may return it to hand at any point, must return if hand empty)"
      );
    });

    test("has correct objective text", () => {
      expect(Shadowfax.objective.text).toBe(
        "Win at least two tricks containing a hills card"
      );
    });
  });
});
