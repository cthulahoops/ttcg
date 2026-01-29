import { describe, expect, test } from "bun:test";
import { Gwaihir } from "./gwaihir";
import { GameStateBuilder } from "../test-utils";

describe("Gwaihir", () => {
  describe("objective.getStatus", () => {
    test("returns { tentative, failure } when no tricks have been won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .build();

      expect(Gwaihir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when tricks won contain no mountains and no mountains available", () => {
      // All mountains are won by other seats, so seat 0 cannot achieve objective
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .seatWonCards(1, [
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "mountains", value: 4 },
          { suit: "mountains", value: 5 },
        ])
        .seatWonCards(2, [
          { suit: "mountains", value: 6 },
          { suit: "mountains", value: 7 },
          { suit: "mountains", value: 8 },
        ])
        // Seat 0 wins tricks with no mountains (filler will also be non-mountains now)
        .seatWonCards(0, [{ suit: "forests", value: 1 }])
        .seatWonCards(0, [{ suit: "shadows", value: 1 }])
        .build();

      // Since all mountains are gone, this is final failure
      expect(Gwaihir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only 1 trick contains mountains but more available", () => {
      // Use seatWonTrick with full 4-card tricks to avoid auto-fill
      // Gwaihir has 1 mountain trick, mountains 5,6,7 go to hands
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        // Seat 1 wins 3 mountains (in one trick with other cards)
        .seatWonTrick(1, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 1 },
          { suit: "forests", value: 1 },
          { suit: "hills", value: 1 },
        ])
        .seatWonTrick(1, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 2 },
          { suit: "hills", value: 2 },
        ])
        .seatWonTrick(1, [
          { suit: "mountains", value: 4 },
          { suit: "shadows", value: 3 },
          { suit: "forests", value: 3 },
          { suit: "hills", value: 3 },
        ])
        // Gwaihir wins 1 mountain trick
        .seatWonTrick(0, [
          { suit: "mountains", value: 8 },
          { suit: "shadows", value: 4 },
          { suit: "forests", value: 4 },
          { suit: "hills", value: 4 },
        ])
        // Mountains 5, 6, 7 remain in hands (lost card is mountains-1)
        .build();

      expect(Gwaihir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when only 1 trick contains mountains and none available", () => {
      // Use seatWonTrick with full 4-card tricks to control exactly which cards are won
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        // Seat 1 wins 6 mountains (each in separate tricks)
        .seatWonTrick(1, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 1 },
          { suit: "forests", value: 1 },
          { suit: "hills", value: 1 },
        ])
        .seatWonTrick(1, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 2 },
          { suit: "hills", value: 2 },
        ])
        .seatWonTrick(1, [
          { suit: "mountains", value: 4 },
          { suit: "shadows", value: 3 },
          { suit: "forests", value: 3 },
          { suit: "hills", value: 3 },
        ])
        .seatWonTrick(1, [
          { suit: "mountains", value: 5 },
          { suit: "shadows", value: 4 },
          { suit: "forests", value: 4 },
          { suit: "hills", value: 4 },
        ])
        .seatWonTrick(1, [
          { suit: "mountains", value: 6 },
          { suit: "shadows", value: 5 },
          { suit: "forests", value: 5 },
          { suit: "hills", value: 5 },
        ])
        .seatWonTrick(1, [
          { suit: "mountains", value: 7 },
          { suit: "shadows", value: 6 },
          { suit: "forests", value: 6 },
          { suit: "hills", value: 6 },
        ])
        // Gwaihir wins 1 mountain trick
        .seatWonTrick(0, [
          { suit: "mountains", value: 8 },
          { suit: "shadows", value: 7 },
          { suit: "forests", value: 7 },
          { suit: "hills", value: 7 },
        ])
        // Gwaihir wins another trick (no mountains)
        .seatWonTrick(0, [
          { suit: "shadows", value: 8 },
          { suit: "forests", value: 8 },
          { suit: "hills", value: 8 },
          { suit: "rings", value: 1 },
        ])
        .build();

      // All mountains are accounted for (7 won + 1 lost), Gwaihir can't get another mountain trick
      expect(Gwaihir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when exactly 2 tricks contain mountains", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .seatWonCards(0, [{ suit: "mountains", value: 3 }])
        .seatWonCards(0, [{ suit: "mountains", value: 7 }])
        .build();

      expect(Gwaihir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, success } when more than 2 tricks contain mountains", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .seatWonCards(0, [{ suit: "mountains", value: 2 }])
        .seatWonCards(0, [{ suit: "mountains", value: 3 }])
        .seatWonCards(0, [{ suit: "mountains", value: 4 }])
        .build();

      expect(Gwaihir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("counts tricks with mountains, not mountain cards", () => {
      // Create ONE trick with multiple mountain cards
      // Specifying one mountain card will fill the rest of the trick with more mountains
      // since mountains are first in the sorted remaining deck
      // mountains-1 is the lost card, so mountains-2,3,4 will be filler
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .seatWonCards(0, [{ suit: "mountains", value: 8 }])
        .build();

      // This trick has mountains-8 plus mountains-2,3,4 as filler = 4 mountains in 1 trick
      // Should still be failure since it's only 1 trick containing mountains
      expect(Gwaihir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("counts tricks with mountains correctly when mixed with other suits", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        // First trick: mountains + other cards
        .seatWonCards(0, [{ suit: "mountains", value: 5 }])
        // Second trick: mountains
        .seatWonCards(0, [{ suit: "mountains", value: 6 }])
        .build();

      expect(Gwaihir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { final, failure } when game finished but check fails", () => {
      // Give all mountains to other seats so seat 0 has only 1 trick with mountains
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .seatWonCards(1, [
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "mountains", value: 4 },
          { suit: "mountains", value: 5 },
          { suit: "mountains", value: 6 },
          { suit: "mountains", value: 7 },
        ])
        .seatWonCards(0, [{ suit: "mountains", value: 8 }])
        .seatWonTricks(2, 1)
        .seatWonTricks(3, 1)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(Gwaihir.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows 0/2 when no mountain tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .build();

      const details = Gwaihir.objective.getDetails!(game, seats[0]!);
      expect(details).toBe("Tricks with mountains: 0/2");
    });

    test("shows 1/2 when 1 mountain trick won", () => {
      // Give most mountains to other seats so only 1 trick has mountains
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .seatWonCards(1, [
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "mountains", value: 4 },
          { suit: "mountains", value: 5 },
          { suit: "mountains", value: 6 },
          { suit: "mountains", value: 7 },
        ])
        .seatWonCards(0, [{ suit: "mountains", value: 8 }])
        .build();

      const details = Gwaihir.objective.getDetails!(game, seats[0]!);
      expect(details).toBe("Tricks with mountains: 1/2");
    });

    test("shows 2/2 when objective achieved", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .seatWonCards(0, [{ suit: "mountains", value: 2 }])
        .seatWonCards(0, [{ suit: "mountains", value: 3 }])
        .build();

      const details = Gwaihir.objective.getDetails!(game, seats[0]!);
      expect(details).toBe("Tricks with mountains: 2/2");
    });

    test("shows count greater than 2 when exceeding target", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .seatWonCards(0, [{ suit: "mountains", value: 2 }])
        .seatWonCards(0, [{ suit: "mountains", value: 3 }])
        .seatWonCards(0, [{ suit: "mountains", value: 4 }])
        .build();

      const details = Gwaihir.objective.getDetails!(game, seats[0]!);
      expect(details).toBe("Tricks with mountains: 3/2");
    });
  });

  describe("display.getObjectiveCards", () => {
    test("returns empty array when no tricks won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .build();

      const result = Gwaihir.display.getObjectiveCards!(game, seats[0]!);
      expect(result.cards).toEqual([]);
    });

    test("returns empty array when won tricks have no mountains", () => {
      // Give all mountains to other seats so seat 0's tricks have no mountains
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .seatWonCards(1, [
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "mountains", value: 4 },
          { suit: "mountains", value: 5 },
        ])
        .seatWonCards(2, [
          { suit: "mountains", value: 6 },
          { suit: "mountains", value: 7 },
          { suit: "mountains", value: 8 },
        ])
        .seatWonCards(0, [{ suit: "forests", value: 1 }])
        .seatWonCards(0, [{ suit: "shadows", value: 1 }])
        .build();

      const result = Gwaihir.display.getObjectiveCards!(game, seats[0]!);
      expect(result.cards).toEqual([]);
    });

    test("returns 1 trick marker when 1 trick contains mountains", () => {
      // Give most mountains to other seats so only 1 trick has mountains
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .seatWonCards(1, [
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "mountains", value: 4 },
          { suit: "mountains", value: 5 },
          { suit: "mountains", value: 6 },
          { suit: "mountains", value: 7 },
        ])
        .seatWonCards(0, [{ suit: "mountains", value: 8 }])
        .seatWonCards(0, [{ suit: "forests", value: 1 }])
        .build();

      const result = Gwaihir.display.getObjectiveCards!(game, seats[0]!);
      expect(result.cards).toEqual(["trick"]);
    });

    test("returns 2 trick markers when 2 tricks contain mountains", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .seatWonCards(0, [{ suit: "mountains", value: 4 }])
        .seatWonCards(0, [{ suit: "mountains", value: 7 }])
        .build();

      const result = Gwaihir.display.getObjectiveCards!(game, seats[0]!);
      expect(result.cards).toEqual(["trick", "trick"]);
    });

    test("returns trick markers for each qualifying trick, not individual mountain cards", () => {
      // Create ONE trick with multiple mountain cards
      // mountains-1 is the lost card, specifying mountains-8 will fill with mountains-2,3,4
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gwaihir")
        .seatWonCards(0, [{ suit: "mountains", value: 8 }])
        .build();

      const result = Gwaihir.display.getObjectiveCards!(game, seats[0]!);
      // Should be 1 trick marker, not 4 (for 4 mountain cards)
      expect(result.cards).toEqual(["trick"]);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Gwaihir.name).toBe("Gwaihir");
    });

    test("has correct setupText", () => {
      expect(Gwaihir.setupText).toBe("Exchange with Gandalf twice");
    });

    test("has correct objective text", () => {
      expect(Gwaihir.objective.text).toBe(
        "Win at least two tricks containing a mountain card"
      );
    });
  });
});
