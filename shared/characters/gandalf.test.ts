import { describe, expect, test } from "bun:test";
import { Gandalf } from "./gandalf";
import { GameStateBuilder } from "../test-utils";

describe("Gandalf", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gandalf")
        .build();

      expect(Gandalf.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when exactly 1 trick won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gandalf")
        .seatWonTricks(0, 1)
        .build();

      expect(Gandalf.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when multiple tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gandalf")
        .seatWonTricks(0, 3)
        .build();

      expect(Gandalf.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, failure } when other players have won all tricks so far", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gandalf")
        .seatWonTricks(1, 3)
        .build();

      expect(Gandalf.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Gandalf.name).toBe("Gandalf");
    });

    test("has correct setupText", () => {
      expect(Gandalf.setupText).toBe(
        "Take the lost card, then exchange with Frodo"
      );
    });

    test("has correct objective text", () => {
      expect(Gandalf.objective.text).toBe("Win at least one trick");
    });
  });
});
