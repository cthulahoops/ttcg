import { describe, expect, test } from "bun:test";
import { Galadriel } from "./galadriel";
import { Game } from "../game";
import { Seat } from "../seat";
import { PlayerHand } from "../hands";
import { Controller } from "../controllers";
import type { Card } from "../types";

// Test helper: create a minimal controller for testing
class TestController extends Controller {
  async chooseButton<T>(): Promise<T> {
    throw new Error("Not implemented in test");
  }
  async chooseCard<T>(): Promise<T> {
    throw new Error("Not implemented in test");
  }
  async selectCard(): Promise<Card> {
    throw new Error("Not implemented in test");
  }
}

// Test helper: create a game with the specified number of characters
function createTestGame(numCharacters: number): Game {
  const seats: Seat[] = [];
  for (let i = 0; i < numCharacters; i++) {
    const controller = new TestController();
    const hand = new PlayerHand();
    seats.push(new Seat(i, controller, hand, false));
  }
  const lostCard: Card = { suit: "mountains", value: 1 };
  return new Game(numCharacters, numCharacters, seats, lostCard, 0);
}

// Test helper: add won cards to a seat (simulates winning a trick)
function addWonCards(seat: Seat, cards: Card[]): void {
  seat.addTrick(seat.tricksWon.length, cards);
}

describe("Galadriel", () => {
  describe("objective.check", () => {
    test("returns false when all players have 0 tricks (tied for min and max)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // All players have 0 tricks - Galadriel is both min and max
      expect(Galadriel.objective.check(game, seat)).toBe(false);
    });

    test("returns false when alone with fewest tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Give other players tricks, Galadriel has none - she has the fewest
      addWonCards(game.seats[1]!, [{ suit: "mountains", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "forests", value: 4 }]);
      expect(Galadriel.objective.check(game, seat)).toBe(false);
    });

    test("returns false when alone with most tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Give Galadriel more tricks than everyone else
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[1]!, [{ suit: "forests", value: 3 }]);
      expect(Galadriel.objective.check(game, seat)).toBe(false);
    });

    test("returns true when in the middle (not min, not max)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Galadriel: 1 trick, others: 0, 2, 2 tricks
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 4 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 1 }]);
      // Min=0 (seat 1), Max=2 (seats 2,3), Galadriel=1
      expect(Galadriel.objective.check(game, seat)).toBe(true);
    });

    test("returns false when tied for min (even if others have more)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Galadriel: 0 tricks, seat 1: 0 tricks, seats 2,3: 1 trick each
      addWonCards(game.seats[2]!, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[3]!, [{ suit: "shadows", value: 2 }]);
      // Min=0 (seats 0,1), Max=1 (seats 2,3), Galadriel=0 (=min)
      expect(Galadriel.objective.check(game, seat)).toBe(false);
    });

    test("returns false when tied for max (even if others have fewer)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Galadriel: 2 tricks, seat 1: 2 tricks, seats 2,3: 1 trick each
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[1]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[1]!, [{ suit: "hills", value: 4 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[3]!, [{ suit: "mountains", value: 5 }]);
      // Min=1 (seats 2,3), Max=2 (seats 0,1), Galadriel=2 (=max)
      expect(Galadriel.objective.check(game, seat)).toBe(false);
    });

    test("returns true when strictly between min and max in 3-player game", () => {
      const game = createTestGame(3);
      const seat = game.seats[0]!;
      // Galadriel: 2 tricks, seat 1: 1 trick, seat 2: 3 tricks
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[1]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[2]!, [{ suit: "hills", value: 4 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "mountains", value: 5 }]);
      // Min=1, Max=3, Galadriel=2
      expect(Galadriel.objective.check(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompletable", () => {
    test("returns true at start of game", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Galadriel.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when middle position is achievable", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Galadriel has 1 trick, one other has 0, two others have 2
      // Galadriel can stay at 1 while someone at 0 stays, someone at 2 stays
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 4 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 1 }]);
      expect(Galadriel.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when not enough tricks remain to create spread", () => {
      const game = createTestGame(4);
      game.currentTrickNumber = 8; // Only 1 trick remaining (9-8=1)
      const seat = game.seats[0]!;
      // Everyone has 0 tricks, but only 1 trick left - impossible to have someone below
      // Galadriel and someone above
      expect(Galadriel.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns true when already in middle position", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Galadriel: 1, others: 0, 2, 2 - already in middle
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 4 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 1 }]);
      expect(Galadriel.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when current min equals max with no tricks remaining", () => {
      const game = createTestGame(4);
      game.currentTrickNumber = 9; // 0 tricks remaining
      const seat = game.seats[0]!;
      // Everyone has 1 trick - Galadriel is both min and max
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 4 }]);
      expect(Galadriel.objective.isCompletable(game, seat)).toBe(false);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns true early when guaranteed in middle position", () => {
      const game2 = createTestGame(4);
      game2.currentTrickNumber = 7; // 2 tricks remaining
      const seat2 = game2.seats[0]!;
      for (const s of game2.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }

      // Galadriel: 3 tricks
      // Seat 1: 0 tricks (max possible = 0 + 2 = 2, which is < 3)
      // Seat 2: 6 tricks (min above = 6, Galadriel max = 3 + 2 = 5 < 6)
      // Seat 3: 0 tricks (max possible = 0 + 2 = 2, which is < 3)
      addWonCards(seat2, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat2, [{ suit: "shadows", value: 1 }]);
      addWonCards(seat2, [{ suit: "forests", value: 1 }]);
      addWonCards(game2.seats[2]!, [{ suit: "hills", value: 1 }]);
      addWonCards(game2.seats[2]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game2.seats[2]!, [{ suit: "mountains", value: 2 }]);
      addWonCards(game2.seats[2]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game2.seats[2]!, [{ suit: "forests", value: 2 }]);
      addWonCards(game2.seats[2]!, [{ suit: "hills", value: 2 }]);

      expect(game2.finished).toBe(false);
      expect(game2.tricksRemaining()).toBe(2);
      expect(seat2.getTrickCount()).toBe(3);
      expect(game2.seats[1]!.getTrickCount()).toBe(0);
      expect(game2.seats[2]!.getTrickCount()).toBe(6);
      expect(game2.seats[3]!.getTrickCount()).toBe(0);

      // Galadriel is guaranteed to be in the middle:
      // - Players below her (0 tricks each) can get at most 2 more = 2 tricks < 3
      // - Galadriel can get at most 3 + 2 = 5 tricks < 6 (the minimum above)
      expect(Galadriel.objective.isCompleted(game2, seat2)).toBe(true);
    });

    test("returns false early when could still become fewest", () => {
      const game = createTestGame(4);
      game.currentTrickNumber = 6; // 3 tricks remaining
      const seat = game.seats[0]!;
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }

      // Galadriel: 2 tricks
      // Seat 1: 0 tricks (can reach 0 + 3 = 3 > 2, so Galadriel could be fewest)
      // Seat 2: 5 tricks (above)
      // Seat 3: 1 trick (below, can reach 1 + 3 = 4 > 2)
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "hills", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "mountains", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[3]!, [{ suit: "forests", value: 2 }]);

      expect(game.finished).toBe(false);
      expect(seat.getTrickCount()).toBe(2);
      // Seat 1 at 0 can reach 3, which is > 2, so Galadriel could become fewest
      expect(Galadriel.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns false early when could still become most", () => {
      const game = createTestGame(4);
      game.currentTrickNumber = 6; // 3 tricks remaining
      const seat = game.seats[0]!;
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }

      // Galadriel: 3 tricks
      // Seat 1: 0 tricks (below)
      // Seat 2: 4 tricks (above, but Galadriel can reach 3 + 3 = 6 > 4)
      // Seat 3: 1 trick (below)
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 1 }]);
      addWonCards(seat, [{ suit: "forests", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "hills", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "mountains", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[3]!, [{ suit: "forests", value: 2 }]);

      expect(game.finished).toBe(false);
      expect(seat.getTrickCount()).toBe(3);
      // Galadriel at 3 can reach 6, which is > 4 (min above), could become most
      expect(Galadriel.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns false early when no one is above (could become most)", () => {
      const game = createTestGame(4);
      game.currentTrickNumber = 7; // 2 tricks remaining
      const seat = game.seats[0]!;
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }

      // Galadriel: 2 tricks (tied for max)
      // Seat 1: 0 tricks
      // Seat 2: 2 tricks (tied with Galadriel)
      // Seat 3: 1 trick
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "hills", value: 1 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 1 }]);

      expect(game.finished).toBe(false);
      // Galadriel is tied for max, no one strictly above her, can't guarantee not-most
      expect(Galadriel.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns false early when no one is below (could become fewest)", () => {
      const game = createTestGame(4);
      game.currentTrickNumber = 7; // 2 tricks remaining
      const seat = game.seats[0]!;
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }

      // Galadriel: 2 tricks (tied for min)
      // Seat 1: 2 tricks (tied with Galadriel)
      // Seat 2: 4 tricks (above)
      // Seat 3: 2 tricks (tied with Galadriel)
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "forests", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "hills", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "mountains", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 2 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 2 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 2 }]);

      expect(game.finished).toBe(false);
      // Galadriel is tied for min, no one strictly below her, can't guarantee not-fewest
      expect(Galadriel.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns false when game is not finished and not guaranteed", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      // Galadriel: 1, others: 0, 2, 2 - in middle but not guaranteed
      addWonCards(seat, [{ suit: "mountains", value: 5 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 6 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 7 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 8 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 2 }]);
      expect(game.finished).toBe(false);
      expect(Galadriel.objective.check(game, seat)).toBe(true);
      // With many tricks remaining, positions can still change
      expect(Galadriel.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true when game finished and in middle position", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Galadriel: 1, others: 0, 2, 2
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 4 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 1 }]);
      expect(game.finished).toBe(true);
      expect(Galadriel.objective.isCompleted(game, seat)).toBe(true);
    });

    test("returns false when game finished but at min", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Galadriel: 0 tricks, others have more
      addWonCards(game.seats[1]!, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[3]!, [{ suit: "forests", value: 3 }]);
      expect(game.finished).toBe(true);
      expect(Galadriel.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns false when game finished but at max", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Galadriel: 2 tricks, others have fewer
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[1]!, [{ suit: "forests", value: 3 }]);
      expect(game.finished).toBe(true);
      expect(Galadriel.objective.isCompleted(game, seat)).toBe(false);
    });
  });

  describe("display.renderStatus", () => {
    test("shows met=false when at min", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Galadriel has 0, others have 1, 1, 1
      addWonCards(game.seats[1]!, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[3]!, [{ suit: "forests", value: 3 }]);
      const status = Galadriel.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
    });

    test("shows met=true when in middle", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Galadriel: 1, others: 0, 2, 2
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 4 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 1 }]);
      const status = Galadriel.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
    });

    test("shows completable=false when impossible to reach middle", () => {
      const game = createTestGame(4);
      game.currentTrickNumber = 8; // Only 1 trick remaining
      const seat = game.seats[0]!;
      // Everyone at 0, can't create spread with only 1 trick
      const status = Galadriel.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(false);
    });

    test("shows completed=true when game finished and in middle", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Galadriel: 1, others: 0, 2, 2
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 4 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 1 }]);
      expect(game.finished).toBe(true);
      const status = Galadriel.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
      expect(status.completed).toBe(true);
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
