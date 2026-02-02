import { describe, expect, test } from "bun:test";
import { FattyBolger } from "./fatty-bolger";
import { GameStateBuilder } from "../test-utils";

describe("Fatty Bolger", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .build();

      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when exactly 1 trick won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .seatWonCards(0, [{ suit: "mountains", value: 5 }])
        .build();

      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when exactly 1 trick won (game finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .seatWonTricks(0, 1)
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(1);
      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when 2 tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
        ])
        .build();

      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when more than 2 tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 3 },
        ])
        .build();

      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished but objective not met (no tricks)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 3)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(0);
      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when hand is empty and no tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .emptyHand(0)
        .build();

      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when exactly 1 trick won and hand is empty", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Fatty Bolger")
        .seatWonCards(0, [{ suit: "mountains", value: 5 }])
        .emptyHand(0)
        .build();

      expect(FattyBolger.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(FattyBolger.name).toBe("Fatty Bolger");
    });

    test("has correct setupText", () => {
      expect(FattyBolger.setupText).toBe(
        "Give a card to every other character (don't take any back)"
      );
    });

    test("has correct objective text", () => {
      expect(FattyBolger.objective.text).toBe("Win exactly one trick");
    });
  });
});
