import { describe, expect, test } from "bun:test";
import { Celeborn } from "./celeborn";
import { GameStateBuilder } from "../test-utils";

describe("Celeborn", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no cards won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .build();

      expect(Celeborn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game is finished and no rank has 3 cards", () => {
      // Seat 0 wins exactly 4 cards (2 of rank 2, 2 of rank 3), no rank has 3+
      // Give remaining 4 cards of ranks 2-3 to seat 1, finishGame distributes rest
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .seatWonTrick(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 3 },
          { suit: "hills", value: 3 },
        ])
        .seatWonTrick(1, [
          { suit: "forests", value: 2 },
          { suit: "hills", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 3 },
        ])
        .finishGame()
        .build();

      expect(Celeborn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when exactly 3 cards of same rank", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .seatWonCards(0, [
          { suit: "mountains", value: 5 },
          { suit: "shadows", value: 5 },
          { suit: "forests", value: 5 },
        ])
        .build();

      expect(Celeborn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when 4 cards of same rank", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .seatWonCards(0, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 3 },
          { suit: "forests", value: 3 },
          { suit: "hills", value: 3 },
        ])
        .build();

      expect(Celeborn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when one rank has 3+ even if others have fewer", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 2 },
          { suit: "hills", value: 7 },
          { suit: "mountains", value: 8 },
        ])
        .build();

      expect(Celeborn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("counts cards across multiple tricks", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .seatWonCards(0, [
          { suit: "mountains", value: 4 },
          { suit: "shadows", value: 4 },
          { suit: "forests", value: 4 },
        ])
        .build();

      expect(Celeborn.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("returns undefined when no cards won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .build();

      expect(Celeborn.objective.getDetails!(game, seats[0]!)).toBeUndefined();
    });

    test("returns undefined when no rank has 2+ cards", () => {
      // Seat 0 wins exactly 3 cards with distinct ranks (1, 2, 3)
      // Distribute ALL cards of ranks 1-3 and 4-8 so seat 0 gets nothing extra
      // Use mountains-4 as lost card to avoid conflicts
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .withLostCard({ suit: "mountains", value: 4 })
        .seatWonCards(0, [
          { suit: "mountains", value: 1 },
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
        ])
        // All other 1s, 2s, 3s go to seat 1
        .seatWonCards(1, [
          { suit: "shadows", value: 1 },
          { suit: "forests", value: 1 },
          { suit: "hills", value: 1 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 2 },
          { suit: "hills", value: 2 },
          { suit: "shadows", value: 3 },
          { suit: "forests", value: 3 },
          { suit: "hills", value: 3 },
        ])
        // All 4s, 5s go to seat 2 (mountains-4 is lost, so only 3 fours)
        .seatWonCards(2, [
          { suit: "shadows", value: 4 },
          { suit: "forests", value: 4 },
          { suit: "hills", value: 4 },
          { suit: "mountains", value: 5 },
          { suit: "shadows", value: 5 },
          { suit: "forests", value: 5 },
          { suit: "hills", value: 5 },
        ])
        // All 6s, 7s, 8s, and rings go to seat 3
        .seatWonCards(3, [
          { suit: "mountains", value: 6 },
          { suit: "shadows", value: 6 },
          { suit: "forests", value: 6 },
          { suit: "hills", value: 6 },
          { suit: "mountains", value: 7 },
          { suit: "shadows", value: 7 },
          { suit: "forests", value: 7 },
          { suit: "hills", value: 7 },
          { suit: "mountains", value: 8 },
          { suit: "shadows", value: 8 },
          { suit: "forests", value: 8 },
          { suit: "hills", value: 8 },
          { suit: "rings", value: 1 },
          { suit: "rings", value: 2 },
          { suit: "rings", value: 3 },
          { suit: "rings", value: 4 },
          { suit: "rings", value: 5 },
        ])
        .finishGame()
        .build();

      expect(Celeborn.objective.getDetails!(game, seats[0]!)).toBeUndefined();
    });

    test("shows details for ranks with 2+ cards", () => {
      // Seat 0 wins exactly 2 of rank 3 and 2 of rank 5
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .seatWonTrick(0, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 3 },
          { suit: "forests", value: 5 },
          { suit: "hills", value: 5 },
        ])
        .build();

      const details = Celeborn.objective.getDetails!(game, seats[0]!);
      expect(details).toContain("3:2");
      expect(details).toContain("5:2");
    });

    test("shows details with 3+ count when objective met", () => {
      // Seat 0 wins exactly 3 of rank 4
      // Distribute ALL cards so seat 0 gets nothing extra
      // Use mountains-1 as lost card (default)
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Celeborn")
        .seatWonCards(0, [
          { suit: "mountains", value: 4 },
          { suit: "shadows", value: 4 },
          { suit: "forests", value: 4 },
        ])
        // All other 4s go to seat 1, plus 1s and 2s
        .seatWonCards(1, [
          { suit: "hills", value: 4 },
          { suit: "shadows", value: 1 },
          { suit: "forests", value: 1 },
          { suit: "hills", value: 1 },
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 2 },
          { suit: "hills", value: 2 },
        ])
        // 3s and 5s go to seat 2
        .seatWonCards(2, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 3 },
          { suit: "forests", value: 3 },
          { suit: "hills", value: 3 },
          { suit: "mountains", value: 5 },
          { suit: "shadows", value: 5 },
          { suit: "forests", value: 5 },
          { suit: "hills", value: 5 },
        ])
        // 6s, 7s, 8s, and rings go to seat 3
        .seatWonCards(3, [
          { suit: "mountains", value: 6 },
          { suit: "shadows", value: 6 },
          { suit: "forests", value: 6 },
          { suit: "hills", value: 6 },
          { suit: "mountains", value: 7 },
          { suit: "shadows", value: 7 },
          { suit: "forests", value: 7 },
          { suit: "hills", value: 7 },
          { suit: "mountains", value: 8 },
          { suit: "shadows", value: 8 },
          { suit: "forests", value: 8 },
          { suit: "hills", value: 8 },
          { suit: "rings", value: 1 },
          { suit: "rings", value: 2 },
          { suit: "rings", value: 3 },
          { suit: "rings", value: 4 },
          { suit: "rings", value: 5 },
        ])
        .finishGame()
        .build();

      expect(Celeborn.objective.getDetails!(game, seats[0]!)).toBe("4:3");
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Celeborn.name).toBe("Celeborn");
    });

    test("has correct setupText", () => {
      expect(Celeborn.setupText).toBe("Exchange with any player");
    });

    test("has correct objective text", () => {
      expect(Celeborn.objective.text).toBe(
        "Win at least three cards of the same rank"
      );
    });
  });
});
