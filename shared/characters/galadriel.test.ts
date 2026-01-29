import { describe, expect, test } from "bun:test";
import { Galadriel } from "./galadriel";
import { GameStateBuilder } from "../test-utils";

describe("Galadriel", () => {
  describe("objective.getStatus", () => {
    test("returns { final, failure } when all players have 0 tricks (tied for min and max)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        .finishGame()
        .build();

      // All players have 0 tricks - Galadriel is both min and max
      // Game is finished (no cards in hands)
      expect(game.finished).toBe(true);
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when alone with fewest tricks (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Give other players tricks, Galadriel has none - she has the fewest
        .seatWonTricks(1, 1)
        .seatWonTricks(2, 1)
        .seatWonTricks(3, 1)
        .build();

      expect(game.finished).toBe(false);
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when alone with most tricks (game finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Give Galadriel more tricks than everyone else
        .seatWonTricks(0, 2)
        .seatWonTricks(1, 1)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when in the middle (not min, not max, game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Galadriel: 1 trick, others: 0, 2, 2 tricks
        .seatWonTricks(0, 1)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        // Min=0 (seat 1), Max=2 (seats 2,3), Galadriel=1
        .build();

      expect(game.finished).toBe(false);
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when in the middle (game finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Galadriel: 1 trick, others: 0, 2, 2 tricks
        .seatWonTricks(0, 1)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        // Min=0 (seat 1), Max=2 (seats 2,3), Galadriel=1
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, failure } when tied for min (even if others have more)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Galadriel: 0 tricks, seat 1: 0 tricks, seats 2,3: 1 trick each
        .seatWonTricks(2, 1)
        .seatWonTricks(3, 1)
        // Min=0 (seats 0,1), Max=1 (seats 2,3), Galadriel=0 (=min)
        .build();

      expect(game.finished).toBe(false);
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when tied for max (even if others have fewer)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Galadriel: 2 tricks, seat 1: 2 tricks, seats 2,3: 1 trick each
        .seatWonTricks(0, 2)
        .seatWonTricks(1, 2)
        .seatWonTricks(2, 1)
        .seatWonTricks(3, 1)
        // Min=1 (seats 2,3), Max=2 (seats 0,1), Galadriel=2 (=max)
        .build();

      expect(game.finished).toBe(false);
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when strictly between min and max in 3-player game", () => {
      const { game, seats } = new GameStateBuilder(3)
        .setCharacter(0, "Galadriel")
        // Galadriel: 2 tricks, seat 1: 1 trick, seat 2: 3 tricks
        .seatWonTricks(0, 2)
        .seatWonTricks(1, 1)
        .seatWonTricks(2, 3)
        // Min=1, Max=3, Galadriel=2
        .build();

      expect(game.finished).toBe(false);
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, failure } when not enough tricks remain to create spread", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // 9 tricks total in 4-player, give each player 2 tricks (8 total), leaving 1 remaining
        // When everyone is tied at 2, Galadriel needs:
        // - targetGaladriel = max(2+1, 2) = 3 (to not be at min)
        // - targetMax = max(2, 4) = 4 (someone needs to be above her target)
        // - tricksNeededForGaladriel = 3-2 = 1
        // - tricksNeededForMax = 4-2 = 2
        // - completable = 1+2 <= 1 = FALSE (impossible to create spread with 1 trick)
        .seatWonTricks(0, 2)
        .seatWonTricks(1, 2)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .build();

      expect(game.tricksRemaining()).toBe(1);
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, success } early when guaranteed in middle position", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // 8 tricks played, 1 remaining
        // Galadriel: 3 tricks
        // Seat 1: 0 tricks (max possible = 0 + 1 = 1, which is < 3)
        // Seat 2: 5 tricks (min above = 5, Galadriel max = 3 + 1 = 4 < 5)
        // Seat 3: 0 tricks (max possible = 0 + 1 = 1, which is < 3)
        .seatWonTricks(0, 3)
        .seatWonTricks(2, 5)
        .build();

      expect(game.finished).toBe(false);
      expect(game.tricksRemaining()).toBe(1);
      expect(seats[0]!.getTrickCount()).toBe(3);
      expect(seats[1]!.getTrickCount()).toBe(0);
      expect(seats[2]!.getTrickCount()).toBe(5);
      expect(seats[3]!.getTrickCount()).toBe(0);

      // Galadriel is guaranteed to be in the middle:
      // - Players below her (0 tricks each) can get at most 1 more = 1 trick < 3
      // - Galadriel can get at most 3 + 1 = 4 tricks < 5 (the minimum above)
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, success } early when could still become fewest", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Galadriel: 2 tricks
        // Seat 1: 0 tricks (can reach 0 + 3 = 3 > 2, so Galadriel could be fewest)
        // Seat 2: 5 tricks (above)
        // Seat 3: 1 trick (below, can reach 1 + 3 = 4 > 2)
        .seatWonTricks(0, 2)
        .seatWonTricks(2, 5)
        .seatWonTricks(3, 1)
        .build();

      expect(game.finished).toBe(false);
      expect(seats[0]!.getTrickCount()).toBe(2);
      // Galadriel is currently in the middle (0 < 2 < 5), but position not guaranteed
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { tentative, success } early when could still become most", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Galadriel: 3 tricks
        // Seat 1: 0 tricks (below)
        // Seat 2: 4 tricks (above, but Galadriel can reach 3 + 3 = 6 > 4)
        // Seat 3: 1 trick (below)
        .seatWonTricks(0, 3)
        .seatWonTricks(2, 4)
        .seatWonTricks(3, 1)
        .build();

      expect(game.finished).toBe(false);
      expect(seats[0]!.getTrickCount()).toBe(3);
      // Galadriel is currently in the middle (0 < 3 < 4), but position not guaranteed
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { tentative, failure } early when no one is above (could become most)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Galadriel: 2 tricks (tied for max)
        // Seat 1: 0 tricks
        // Seat 2: 2 tricks (tied with Galadriel)
        // Seat 3: 1 trick
        .seatWonTricks(0, 2)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 1)
        .build();

      expect(game.finished).toBe(false);
      // Galadriel is tied for max, no one strictly above her, can't guarantee not-most
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } early when no one is below (could become fewest)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Galadriel: 1 trick (tied for min)
        // Seat 1: 1 trick (tied with Galadriel)
        // Seat 2: 3 tricks (above)
        // Seat 3: 1 trick (tied with Galadriel)
        // Total: 6 tricks, 3 remaining
        .seatWonTricks(0, 1)
        .seatWonTricks(1, 1)
        .seatWonTricks(2, 3)
        .seatWonTricks(3, 1)
        .build();

      expect(game.finished).toBe(false);
      // Galadriel is tied for min, no one strictly below her, can't guarantee not-fewest
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when game is not finished and in middle but not guaranteed", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Galadriel: 1, others: 0, 2, 2 - in middle but not guaranteed
        .seatWonTricks(0, 1)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .build();

      expect(game.finished).toBe(false);
      // With many tricks remaining, positions can still change
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, failure } when not enough tricks to catch up", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Galadriel: 0 tricks, others have more
        .seatWonTricks(1, 2)
        .seatWonTricks(2, 2)
        .seatWonTricks(3, 2)
        .build();

      expect(game.finished).toBe(false);
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when leading by too much for anyone to catch up", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Galadriel: 5 tricks, others far behind
        // Even if the max other player (1 trick) wins all 3 remaining, they'd have 4 < 5
        .seatWonTricks(0, 5)
        .seatWonTricks(3, 1)
        .build();

      expect(game.finished).toBe(false);
      expect(game.tricksRemaining()).toBe(3);
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } (not final) when exactly enough tricks to achieve middle (boundary case)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Galadriel: 0 tricks, others: 1, 1, 3
        // Currently failing (at minimum), but middle position IS achievable
        // Galadriel needs 2 tricks to beat the min (1), someone already above at 3
        // tricksNeeded = 2, tricksRemaining = 2 (exactly at boundary)
        .seatWonTricks(1, 1)
        .seatWonTricks(2, 1)
        .seatWonTricks(3, 3)
        .build();

      game.currentTrickNumber = 7; // 2 tricks remaining
      expect(game.tricksRemaining()).toBe(2);

      // Currently failing (Galadriel has fewest), but NOT final failure
      // because it's still achievable: Galadriel wins both → 2, others stay 1, 1, 3
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished but at min", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Galadriel: 0 tricks, others have more
        .seatWonTricks(1, 1)
        .seatWonTricks(2, 1)
        .seatWonTricks(3, 1)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished but at max", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Galadriel")
        // Galadriel: 2 tricks, others have fewer
        .seatWonTricks(0, 2)
        .seatWonTricks(1, 1)
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(Galadriel.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Galadriel.name).toBe("Galadriel");
    });

    test("has correct setupText", () => {
      expect(Galadriel.setupText).toBe(
        "Exchange with either the lost card or Gandalf"
      );
    });

    test("has correct objective text", () => {
      expect(Galadriel.objective.text).toBe(
        "Win neither the fewest nor the most tricks"
      );
    });
  });
});
