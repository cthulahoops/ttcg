import { describe, expect, test } from "bun:test";
import { BillThePony } from "./bill-the-pony";
import { GameStateBuilder } from "../test-utils";

describe("Bill the Pony", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bill the Pony")
        .build();

      expect(BillThePony.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when exactly 1 trick won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bill the Pony")
        .seatWonCards(0, [{ suit: "mountains", value: 5 }])
        .build();

      expect(BillThePony.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when exactly 1 trick won (game finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bill the Pony")
        .seatWonTricks(0, 1)
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(1);
      expect(BillThePony.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when 2 tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bill the Pony")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
        ])
        .build();

      expect(BillThePony.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when more than 2 tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bill the Pony")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 3 },
        ])
        .build();

      expect(BillThePony.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished but objective not met (no tricks)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bill the Pony")
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 3)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(seats[0]!.getTrickCount()).toBe(0);
      expect(BillThePony.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(BillThePony.name).toBe("Bill the Pony");
    });

    test("has correct setupText", () => {
      expect(BillThePony.setupText).toBe(
        "Exchange simultaneously with Sam and Frodo"
      );
    });

    test("has correct objective text", () => {
      expect(BillThePony.objective.text).toBe("Win exactly one trick");
    });
  });
});
