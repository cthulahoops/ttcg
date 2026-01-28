import { describe, expect, test } from "bun:test";
import { Merry } from "./merry";
import { GameStateBuilder } from "../test-utils";

describe("Merry", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry")
        .build();

      expect(Merry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when exactly 1 trick won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry")
        .seatWonCards(0, [{ suit: "mountains", value: 5 }])
        .build();

      expect(Merry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when exactly 2 tricks won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry")
        .seatWonCards(0, [
          { suit: "mountains", value: 5 },
          { suit: "shadows", value: 2 },
        ])
        .build();

      expect(Merry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, failure } when 3 tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 3 },
        ])
        .build();

      expect(Merry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when more than 3 tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 3 },
          { suit: "hills", value: 4 },
        ])
        .build();

      expect(Merry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when game finished and objective met (1 trick)", () => {
      // Merry wins 1 trick, other seats win the remaining 8 tricks
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry")
        .seatWonCards(0, [{ suit: "mountains", value: 2 }])
        // Distribute remaining tricks to other seats (3 each to seats 1,2 and 2 to seat 3)
        .seatWonCards(1, [
          { suit: "mountains", value: 3 },
          { suit: "mountains", value: 4 },
          { suit: "mountains", value: 5 },
        ])
        .seatWonCards(2, [
          { suit: "shadows", value: 3 },
          { suit: "shadows", value: 4 },
          { suit: "shadows", value: 5 },
        ])
        .seatWonCards(3, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
        ])
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(1);
      expect(Merry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when game finished and objective met (2 tricks)", () => {
      // Merry wins 2 tricks, other seats win the remaining 7 tricks
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
        ])
        // Distribute remaining tricks to other seats
        .seatWonCards(1, [
          { suit: "mountains", value: 3 },
          { suit: "mountains", value: 4 },
          { suit: "mountains", value: 5 },
        ])
        .seatWonCards(2, [
          { suit: "shadows", value: 3 },
          { suit: "shadows", value: 4 },
        ])
        .seatWonCards(3, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
        ])
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(2);
      expect(Merry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when game finished and no tricks won", () => {
      // Merry wins 0 tricks, other seats win all 9 tricks
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Merry")
        // Distribute all tricks to other seats
        .seatWonCards(1, [
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "mountains", value: 4 },
        ])
        .seatWonCards(2, [
          { suit: "shadows", value: 2 },
          { suit: "shadows", value: 3 },
          { suit: "shadows", value: 4 },
        ])
        .seatWonCards(3, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
          { suit: "forests", value: 3 },
        ])
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(0);
      expect(Merry.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Merry.name).toBe("Merry");
    });

    test("has correct setupText", () => {
      expect(Merry.setupText).toBe("Exchange with Frodo, Pippin, or Sam");
    });
  });
});
