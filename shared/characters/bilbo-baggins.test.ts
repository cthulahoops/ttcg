import { describe, expect, test } from "bun:test";
import { BilboBaggins } from "./bilbo-baggins";
import { GameStateBuilder } from "../test-utils";

describe("Bilbo Baggins", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bilbo Baggins")
        .build();

      expect(BilboBaggins.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only 2 tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bilbo Baggins")
        .seatWonTricks(0, 2)
        .build();

      expect(BilboBaggins.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when exactly 3 tricks won without 1 of Rings (1-ring still in play)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bilbo Baggins")
        .seatWonTricks(0, 3)
        .build();

      expect(BilboBaggins.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when 3+ tricks won and game finished", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bilbo Baggins")
        .seatWonTricks(0, 3)
        .seatWonCards(1, [{ suit: "rings", value: 1 }])
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 2)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(BilboBaggins.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when 3+ tricks won and 1 of Rings won by another", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bilbo Baggins")
        .seatWonTricks(0, 3)
        .seatWonCards(1, [{ suit: "rings", value: 1 }])
        .build();

      expect(BilboBaggins.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when has 1 of Rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bilbo Baggins")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .seatWonTricks(0, 2)
        .build();

      expect(BilboBaggins.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when not enough tricks remaining to reach 3", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bilbo Baggins")
        .seatWonTricks(1, 3)
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 2)
        .build();

      // With 8 tricks played and 0 won by Bilbo, max possible = 1 which is < 3
      expect(BilboBaggins.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when has other ring cards but not 1 of Rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bilbo Baggins")
        .seatWonCards(0, [
          { suit: "rings", value: 2 },
          { suit: "rings", value: 3 },
          { suit: "hills", value: 3 },
        ])
        .build();

      expect(BilboBaggins.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows correct status when no tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bilbo Baggins")
        .build();

      expect(BilboBaggins.objective.getDetails!(game, seats[0]!)).toBe(
        "Tricks: 0/3, 1-Ring: ✓"
      );
    });

    test("shows tricks count correctly when partially complete", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bilbo Baggins")
        .seatWonTricks(0, 2)
        .build();

      expect(BilboBaggins.objective.getDetails!(game, seats[0]!)).toBe(
        "Tricks: 2/3, 1-Ring: ✓"
      );
    });

    test("shows checkmark when 3+ tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bilbo Baggins")
        .seatWonTricks(0, 3)
        .build();

      expect(BilboBaggins.objective.getDetails!(game, seats[0]!)).toBe(
        "Tricks: ✓, 1-Ring: ✓"
      );
    });

    test("shows failure status when has 1 of Rings", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bilbo Baggins")
        .seatWonCards(0, [{ suit: "rings", value: 1 }])
        .seatWonTricks(0, 2)
        .build();

      expect(BilboBaggins.objective.getDetails!(game, seats[0]!)).toBe(
        "Tricks: ✓, 1-Ring: ✗ (has 1-Ring)"
      );
    });
  });

  describe("setup", () => {
    test("is a no-op function", async () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Bilbo Baggins")
        .build();

      // Should not throw and should complete
      await BilboBaggins.setup(game, seats[0]!, { frodoSeat: seats[0]! });
      // Verify nothing changed
      expect(seats[0]!.tricksWon.length).toBe(0);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(BilboBaggins.name).toBe("Bilbo Baggins");
    });

    test("has correct setupText", () => {
      expect(BilboBaggins.setupText).toBe("No setup action");
    });

    test("has correct objective text", () => {
      expect(BilboBaggins.objective.text).toBe(
        "Win 3 or more tricks; do NOT win the 1 of Rings"
      );
    });
  });
});
