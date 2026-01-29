import { describe, expect, test } from "bun:test";
import { Gloin } from "./gloin";
import { GameStateBuilder } from "../test-utils";

describe("Gloin", () => {
  describe("objective.getStatus", () => {
    test("returns { final, failure } when no mountains won (game finished)", () => {
      // Assign all mountains to other seats so Gloin gets none
      // Note: mountains-1 is the default lost card, so we assign 2-8 to others
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gloin")
        .seatWonCards(1, [
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
        ])
        .seatWonCards(2, [
          { suit: "mountains", value: 4 },
          { suit: "mountains", value: 5 },
        ])
        .seatWonCards(3, [
          { suit: "mountains", value: 6 },
          { suit: "mountains", value: 7 },
          { suit: "mountains", value: 8 },
        ])
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      // Gloin has 0 mountains and can't catch up - final failure
      expect(Gloin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } when game finished and has more mountains than all others", () => {
      // Gloin has 3 mountains, others have 2 each
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gloin")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "mountains", value: 4 },
        ])
        .seatWonCards(1, [
          { suit: "mountains", value: 5 },
          { suit: "mountains", value: 6 },
        ])
        .seatWonCards(2, [
          { suit: "mountains", value: 7 },
          { suit: "mountains", value: 8 },
        ])
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(Gloin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, failure } when tied for most mountains but mountains remain", () => {
      // Use seatWonTrick with full 4-card tricks to avoid auto-fill
      // Gloin has 2 mountains, seat 1 has 2 mountains, mountains 6,7,8 go to hands
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gloin")
        // Gloin wins 2 mountains in separate tricks (with non-mountain fillers)
        .seatWonTrick(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 1 },
          { suit: "forests", value: 1 },
          { suit: "hills", value: 1 },
        ])
        .seatWonTrick(0, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 2 },
          { suit: "hills", value: 2 },
        ])
        // Seat 1 wins 2 mountains in separate tricks (with non-mountain fillers)
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
        // Mountains 6, 7, 8 remain in hands (lost card is mountains-1)
        .build();

      expect(game.finished).toBe(false);
      // Gloin is tied but could still win mountains 6, 7, 8 from hands
      expect(Gloin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when tied and no mountains remain", () => {
      // Use seatWonTrick with full 4-card tricks to control exactly which cards are won
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gloin")
        // Gloin wins 2 mountains
        .seatWonTrick(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 1 },
          { suit: "forests", value: 1 },
          { suit: "hills", value: 1 },
        ])
        .seatWonTrick(0, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 2 },
          { suit: "hills", value: 2 },
        ])
        // Seat 1 wins 2 mountains
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
        // Seat 2 wins remaining mountains (6, 7, 8)
        .seatWonTrick(2, [
          { suit: "mountains", value: 6 },
          { suit: "shadows", value: 5 },
          { suit: "forests", value: 5 },
          { suit: "hills", value: 5 },
        ])
        .seatWonTrick(2, [
          { suit: "mountains", value: 7 },
          { suit: "shadows", value: 6 },
          { suit: "forests", value: 6 },
          { suit: "hills", value: 6 },
        ])
        .seatWonTrick(2, [
          { suit: "mountains", value: 8 },
          { suit: "shadows", value: 7 },
          { suit: "forests", value: 7 },
          { suit: "hills", value: 7 },
        ])
        .build();

      expect(game.finished).toBe(false);
      // All mountains are accounted for (7 won + 1 lost), Gloin is tied and can't improve
      expect(Gloin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when others have too many mountains to overtake", () => {
      // Assign remaining mountains to prevent auto-fill issues
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gloin")
        .seatWonCards(1, [
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "mountains", value: 4 },
          { suit: "mountains", value: 5 },
          { suit: "mountains", value: 6 },
        ])
        .seatWonCards(2, [
          { suit: "mountains", value: 7 },
          { suit: "mountains", value: 8 },
        ])
        .build();

      // Other has 5 mountains, 0 remain - Gloin can't exceed 5
      expect(Gloin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } early when guaranteed to have most mountains", () => {
      // Assign remaining mountain to prevent auto-fill issues
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gloin")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "mountains", value: 4 },
          { suit: "mountains", value: 5 },
          { suit: "mountains", value: 6 },
          { suit: "mountains", value: 7 },
        ])
        .seatWonCards(1, [{ suit: "mountains", value: 8 }])
        .build();

      expect(game.finished).toBe(false);
      // Gloin has 6 mountains, seat 1 has 1, no mountains remain
      // Others can't catch up, so Gloin is guaranteed to have most
      expect(Gloin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when currently has most but another player could catch up", () => {
      // Use seatWonTrick with full 4-card tricks to avoid auto-fill
      // Gloin has 3 mountains, seat 1 has 2, mountains 7,8 go to hands
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gloin")
        // Gloin wins 3 mountains
        .seatWonTrick(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 1 },
          { suit: "forests", value: 1 },
          { suit: "hills", value: 1 },
        ])
        .seatWonTrick(0, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 2 },
          { suit: "hills", value: 2 },
        ])
        .seatWonTrick(0, [
          { suit: "mountains", value: 4 },
          { suit: "shadows", value: 3 },
          { suit: "forests", value: 3 },
          { suit: "hills", value: 3 },
        ])
        // Seat 1 wins 2 mountains
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
        // Mountains 7, 8 remain in hands (lost card is mountains-1)
        .build();

      expect(game.finished).toBe(false);
      // Gloin has 3, seat 1 has 2, mountains 7 and 8 are in hands
      // Seat 1 could win both remaining mountains and tie Gloin at 4
      expect(Gloin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when has most and no mountains remain", () => {
      // Use seatWonTrick with full 4-card tricks to control exactly which cards are won
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gloin")
        // Gloin wins 3 mountains
        .seatWonTrick(0, [
          { suit: "mountains", value: 2 },
          { suit: "shadows", value: 1 },
          { suit: "forests", value: 1 },
          { suit: "hills", value: 1 },
        ])
        .seatWonTrick(0, [
          { suit: "mountains", value: 3 },
          { suit: "shadows", value: 2 },
          { suit: "forests", value: 2 },
          { suit: "hills", value: 2 },
        ])
        .seatWonTrick(0, [
          { suit: "mountains", value: 4 },
          { suit: "shadows", value: 3 },
          { suit: "forests", value: 3 },
          { suit: "hills", value: 3 },
        ])
        // Seat 1 wins 2 mountains
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
        // Seat 2 wins remaining mountains (7, 8)
        .seatWonTrick(2, [
          { suit: "mountains", value: 7 },
          { suit: "shadows", value: 6 },
          { suit: "forests", value: 6 },
          { suit: "hills", value: 6 },
        ])
        .seatWonTrick(2, [
          { suit: "mountains", value: 8 },
          { suit: "shadows", value: 7 },
          { suit: "forests", value: 7 },
          { suit: "hills", value: 7 },
        ])
        .build();

      expect(game.finished).toBe(false);
      // All mountains are won - Gloin has 3, nearest competitor has 2
      // No mountains remain, so Gloin is guaranteed to have the most
      expect(Gloin.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows 'Mountains: 0' when no mountains won", () => {
      // Assign all mountains to other seats
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gloin")
        .seatWonCards(1, [
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "mountains", value: 4 },
        ])
        .seatWonCards(2, [
          { suit: "mountains", value: 5 },
          { suit: "mountains", value: 6 },
        ])
        .seatWonCards(3, [
          { suit: "mountains", value: 7 },
          { suit: "mountains", value: 8 },
        ])
        .build();

      expect(Gloin.objective.getDetails!(game, seats[0]!)).toBe("Mountains: 0");
    });

    test("shows mountains count when mountains won", () => {
      // Assign all mountains explicitly to control counts
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Gloin")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "mountains", value: 4 },
        ])
        .seatWonCards(1, [
          { suit: "mountains", value: 5 },
          { suit: "mountains", value: 6 },
        ])
        .seatWonCards(2, [
          { suit: "mountains", value: 7 },
          { suit: "mountains", value: 8 },
        ])
        .build();

      expect(Gloin.objective.getDetails!(game, seats[0]!)).toBe("Mountains: 3");
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Gloin.name).toBe("Gloin");
    });

    test("has correct setupText", () => {
      expect(Gloin.setupText).toBe("Exchange with Bilbo or Gimli");
    });

    test("has correct objective text", () => {
      expect(Gloin.objective.text).toBe("Win the most mountains cards");
    });
  });
});
