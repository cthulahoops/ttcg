import { describe, expect, test } from "bun:test";
import { Frodo } from "./frodo";
import { GameStateBuilder } from "../test-utils";

describe("Frodo", () => {
  describe("objective.getText", () => {
    test("returns 'two' in 4-player game", () => {
      const { game } = new GameStateBuilder(4).setCharacter(0, "Frodo").build();
      const text = Frodo.objective.getText!(game);
      expect(text).toBe("Win at least two ring cards");
    });

    test("returns 'four' in 3-player game", () => {
      const { game } = new GameStateBuilder(3).setCharacter(0, "Frodo").build();
      const text = Frodo.objective.getText!(game);
      expect(text).toBe("Win at least four ring cards");
    });
  });

  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no rings won in 4-player game", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Frodo")
        .build();

      expect(Frodo.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only 1 ring won in 4-player game", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Frodo")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .build();

      expect(Frodo.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when 2 rings won in 4-player game", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Frodo")
        .seatWonCards(0, [
          { suit: "rings", value: 1 },
          { suit: "rings", value: 2 },
        ])
        .build();

      expect(Frodo.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when more than 2 rings won in 4-player game", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Frodo")
        .seatWonCards(0, [
          { suit: "rings", value: 1 },
          { suit: "rings", value: 2 },
          { suit: "rings", value: 3 },
        ])
        .build();

      expect(Frodo.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, failure } when only 3 rings won in 3-player game", () => {
      const { game, seats } = new GameStateBuilder(3)
        .setCharacter(0, "Frodo")
        .seatWonCards(0, [
          { suit: "rings", value: 1 },
          { suit: "rings", value: 2 },
          { suit: "rings", value: 3 },
        ])
        .build();

      expect(Frodo.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, success } when 4 rings won in 3-player game", () => {
      const { game, seats } = new GameStateBuilder(3)
        .setCharacter(0, "Frodo")
        .seatWonCards(0, [
          { suit: "rings", value: 1 },
          { suit: "rings", value: 2 },
          { suit: "rings", value: 3 },
          { suit: "rings", value: 4 },
        ])
        .build();

      expect(Frodo.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when others have won too many rings in 4-player game", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Frodo")
        .seatWonCards(1, [
          { suit: "rings", value: 1 },
          { suit: "rings", value: 2 },
          { suit: "rings", value: 3 },
          { suit: "rings", value: 4 },
        ])
        .build();

      // Other player wins 4 rings, only 1 remains for Frodo
      expect(Frodo.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when Frodo can still reach 2 rings in 4-player game", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Frodo")
        .seatWonCards(1, [
          { suit: "rings", value: 1 },
          { suit: "rings", value: 2 },
          { suit: "rings", value: 3 },
        ])
        .build();

      // Other player wins 3 rings, 2 remain for Frodo
      expect(Frodo.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when multiple rings can be won in single remaining trick", () => {
      // Regression test: old formula used min(tricksRemaining, ringsRemaining)
      // which incorrectly returned final failure when 1 trick left but 2+ rings available
      // (multiple rings can be won in a single trick if multiple players play rings)
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Frodo")
        // Other players won tricks with 3 rings (leaving rings 4,5 still available)
        .seatWonCards(1, [{ suit: "rings", value: 1 }])
        .seatWonCards(2, [{ suit: "rings", value: 2 }])
        .seatWonCards(3, [{ suit: "rings", value: 3 }])
        // Reserve rings 4,5 to hands so they aren't consumed by auto-filled tricks
        .reserveToHand(0, [{ suit: "rings", value: 4 }])
        .reserveToHand(1, [{ suit: "rings", value: 5 }])
        // Fill up to 8 tricks total (leaving 1 trick remaining in a 9-trick game)
        .seatWonTricks(1, 2)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 1)
        .build();

      // 1 trick remaining, 2 rings available (4 and 5)
      // Frodo needs 2 rings - this IS achievable if both rings are played in the last trick
      expect(game.tricksRemaining()).toBe(1);
      expect(Frodo.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows 'Rings: none' when no rings won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Frodo")
        .build();

      expect(Frodo.objective.getDetails!(game, seats[0]!)).toBe("Rings: none");
    });

    test("shows ring values sorted when rings won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Frodo")
        .seatWonCards(0, [
          { suit: "rings", value: 3 },
          { suit: "rings", value: 1 },
        ])
        .build();

      expect(Frodo.objective.getDetails!(game, seats[0]!)).toBe("Rings: 1, 3");
    });
  });

  describe("setup", () => {
    test("is a no-op function", async () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Frodo")
        .build();

      // Should not throw and should complete
      await Frodo.setup(game, seats[0]!, { frodoSeat: seats[0]! });
      // Verify nothing changed
      expect(seats[0]!.tricksWon.length).toBe(0);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Frodo.name).toBe("Frodo");
    });

    test("has correct setupText", () => {
      expect(Frodo.setupText).toBe("No setup action");
    });
  });
});
