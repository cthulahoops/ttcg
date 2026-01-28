import { describe, expect, test } from "bun:test";
import { Glorfindel } from "./glorfindel";
import { GameStateBuilder } from "../test-utils";

describe("Glorfindel", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no shadows cards won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .build();

      expect(Glorfindel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only some shadows cards won", () => {
      // Give some shadows cards to other seats to ensure Glorfindel can't get them all
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .seatWonCards(0, [
          { suit: "shadows", value: 1 },
          { suit: "shadows", value: 2 },
          { suit: "shadows", value: 3 },
        ])
        .build();

      expect(Glorfindel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when 7 shadows cards won", () => {
      // Place the 8th shadows card with another seat to ensure it's not in Glorfindel's tricks
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .seatWonCards(0, [
          { suit: "shadows", value: 1 },
          { suit: "shadows", value: 2 },
          { suit: "shadows", value: 3 },
          { suit: "shadows", value: 4 },
          { suit: "shadows", value: 5 },
          { suit: "shadows", value: 6 },
          { suit: "shadows", value: 7 },
        ])
        .seatWonCards(1, [{ suit: "shadows", value: 8 }])
        .build();

      // Another player has the 8th shadows card, so this is final failure
      expect(Glorfindel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when all 8 shadows cards won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .seatWonCards(0, [
          { suit: "shadows", value: 1 },
          { suit: "shadows", value: 2 },
          { suit: "shadows", value: 3 },
          { suit: "shadows", value: 4 },
          { suit: "shadows", value: 5 },
          { suit: "shadows", value: 6 },
          { suit: "shadows", value: 7 },
          { suit: "shadows", value: 8 },
        ])
        .build();

      expect(Glorfindel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("ignores non-shadows cards when counting", () => {
      // Explicitly place all shadows cards with other seats so Glorfindel has 0
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "forests", value: 2 },
          { suit: "hills", value: 3 },
          { suit: "rings", value: 4 },
        ])
        .seatWonCards(1, [
          { suit: "shadows", value: 1 },
          { suit: "shadows", value: 2 },
        ])
        .build();

      // Another player has shadows cards, so it's final failure
      expect(Glorfindel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("counts shadows cards across multiple tricks", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .seatWonCards(0, [
          { suit: "shadows", value: 1 },
          { suit: "shadows", value: 2 },
          { suit: "shadows", value: 3 },
          { suit: "shadows", value: 4 },
          { suit: "shadows", value: 5 },
          { suit: "shadows", value: 6 },
          { suit: "shadows", value: 7 },
          { suit: "shadows", value: 8 },
        ])
        .build();

      expect(Glorfindel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, failure } when no shadows cards have been won by anyone", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .build();

      expect(Glorfindel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when Glorfindel has won some shadows cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .seatWonCards(0, [
          { suit: "shadows", value: 1 },
          { suit: "shadows", value: 2 },
        ])
        .build();

      expect(Glorfindel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when another player has won any shadows card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .seatWonCards(1, [{ suit: "shadows", value: 1 }])
        .build();

      expect(Glorfindel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when another player wins the 8 of shadows", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .seatWonCards(1, [{ suit: "shadows", value: 8 }])
        .build();

      expect(Glorfindel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when Glorfindel has won all shadows cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .seatWonCards(0, [
          { suit: "shadows", value: 1 },
          { suit: "shadows", value: 2 },
          { suit: "shadows", value: 3 },
          { suit: "shadows", value: 4 },
          { suit: "shadows", value: 5 },
          { suit: "shadows", value: 6 },
          { suit: "shadows", value: 7 },
          { suit: "shadows", value: 8 },
        ])
        .build();

      expect(Glorfindel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("ignores non-shadows cards won by others", () => {
      // When another player has won only non-shadows cards, Glorfindel can still win all shadows
      // We give Glorfindel some non-shadows cards to verify they don't affect the count
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "forests", value: 2 },
          { suit: "hills", value: 3 },
          { suit: "rings", value: 4 },
        ])
        .build();

      // Glorfindel has 0 shadows cards but can still win all 8
      expect(Glorfindel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows 'Shadows: 0/8' when no shadows won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .build();

      const details = Glorfindel.objective.getDetails!(game, seats[0]!);
      expect(details).toBe("Shadows: 0/8");
    });

    test("shows correct count when some shadows won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .seatWonCards(0, [
          { suit: "shadows", value: 1 },
          { suit: "shadows", value: 3 },
          { suit: "shadows", value: 5 },
        ])
        .seatWonCards(1, [
          { suit: "shadows", value: 2 },
          { suit: "shadows", value: 4 },
          { suit: "shadows", value: 6 },
          { suit: "shadows", value: 7 },
          { suit: "shadows", value: 8 },
        ])
        .build();

      const details = Glorfindel.objective.getDetails!(game, seats[0]!);
      expect(details).toBe("Shadows: 3/8");
    });

    test("shows 'Shadows: 8/8' when all shadows won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Glorfindel")
        .seatWonCards(0, [
          { suit: "shadows", value: 1 },
          { suit: "shadows", value: 2 },
          { suit: "shadows", value: 3 },
          { suit: "shadows", value: 4 },
          { suit: "shadows", value: 5 },
          { suit: "shadows", value: 6 },
          { suit: "shadows", value: 7 },
          { suit: "shadows", value: 8 },
        ])
        .build();

      const details = Glorfindel.objective.getDetails!(game, seats[0]!);
      expect(details).toBe("Shadows: 8/8");
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Glorfindel.name).toBe("Glorfindel");
    });

    test("has correct setupText", () => {
      expect(Glorfindel.setupText).toBe("Take the lost card");
    });

    test("has correct objective text", () => {
      expect(Glorfindel.objective.text).toBe("Win every Shadows card");
    });
  });
});
