import { describe, expect, test } from "bun:test";
import { Pippin } from "./pippin";
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

describe("Pippin", () => {
  describe("objective.check", () => {
    test("returns true when tied for fewest with 0 tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // All players have 0 tricks - Pippin is tied for fewest
      expect(Pippin.objective.check(game, seat)).toBe(true);
    });

    test("returns true when alone with fewest tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Give other players tricks, Pippin has none
      addWonCards(game.seats[1]!, [{ suit: "mountains", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "forests", value: 4 }]);
      expect(Pippin.objective.check(game, seat)).toBe(true);
    });

    test("returns true when tied for fewest with some tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Pippin and seat 1 both have 1 trick, others have more
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[2]!, [{ suit: "hills", value: 4 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 1 }]);
      addWonCards(game.seats[3]!, [{ suit: "mountains", value: 5 }]);
      expect(Pippin.objective.check(game, seat)).toBe(true);
    });

    test("returns false when not tied for fewest", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Pippin has 2 tricks, seat 1 has 1 trick
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[1]!, [{ suit: "forests", value: 3 }]);
      expect(Pippin.objective.check(game, seat)).toBe(false);
    });

    test("returns false when another player has strictly fewer tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Pippin has 1 trick, seat 1 has 0 tricks
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      expect(Pippin.objective.check(game, seat)).toBe(false);
    });
  });

  describe("objective.isCompletable", () => {
    test("returns true when tied for fewest at start", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Pippin.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when others can catch up with remaining tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Pippin has 2 tricks, one other player has 1, two have 0
      // Gap is (2-1) + (2-0) + (2-0) = 1 + 2 + 2 = 5
      // With default tricksToPlay=9 (for 4 players) and currentTrickNumber=0, tricksRemaining=9
      // 5 <= 9, so it's completable
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[1]!, [{ suit: "forests", value: 3 }]);
      expect(Pippin.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when gap equals remaining tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Pippin has 1 trick, everyone else has 0
      // Gap is (1-0) + (1-0) + (1-0) = 3
      // With default tricksToPlay=4 and currentTrickNumber=0, tricksRemaining=4
      // 3 <= 4, so completable
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      expect(Pippin.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when gap exceeds remaining tricks", () => {
      const game = createTestGame(4);
      // Simulate most tricks have been played
      game.currentTrickNumber = 8; // Only 1 trick remaining (9-8=1)
      const seat = game.seats[0]!;
      // Pippin has 2 tricks, everyone else has 0
      // Gap is (2-0) * 3 = 6, but only 1 trick remaining
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      expect(Pippin.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns true when already at minimum", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Everyone has same tricks
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 4 }]);
      // Gap is 0, so always completable
      expect(Pippin.objective.isCompletable(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns false when game is not finished even if objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "mountains", value: s.seatIndex + 1 });
      }
      // Everyone has 0 tricks - Pippin is tied for fewest
      expect(game.finished).toBe(false);
      expect(Pippin.objective.check(game, seat)).toBe(true);
      // Not completed yet - could still win more tricks
      expect(Pippin.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true when game finished and tied for fewest", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // All have same number of tricks, game finished
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 4 }]);
      expect(game.finished).toBe(true);
      expect(Pippin.objective.isCompleted(game, seat)).toBe(true);
    });

    test("returns false when game finished but not tied for fewest", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Pippin has 2 tricks, others have 1
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[1]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[2]!, [{ suit: "hills", value: 4 }]);
      addWonCards(game.seats[3]!, [{ suit: "rings", value: 1 }]);
      expect(game.finished).toBe(true);
      expect(Pippin.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true early when guaranteed fewest (myMax <= othersMin)", () => {
      const game = createTestGame(4);
      game.currentTrickNumber = 7; // 2 tricks remaining (9-7=2)
      const seat = game.seats[0]!;
      // Pippin has 0 tricks, others have 3 tricks each
      // myMax = 0 + 2 = 2
      // othersMin = 3
      // 2 <= 3, so guaranteed fewest
      addWonCards(game.seats[1]!, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "mountains", value: 2 }]);
      addWonCards(game.seats[1]!, [{ suit: "mountains", value: 3 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "shadows", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "forests", value: 1 }]);
      addWonCards(game.seats[3]!, [{ suit: "forests", value: 2 }]);
      addWonCards(game.seats[3]!, [{ suit: "forests", value: 3 }]);
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "hills", value: s.seatIndex + 1 });
      }
      expect(game.finished).toBe(false);
      expect(Pippin.objective.isCompleted(game, seat)).toBe(true);
    });

    test("returns true early when can tie for joint fewest", () => {
      const game = createTestGame(4);
      game.currentTrickNumber = 8; // 1 trick remaining (9-8=1)
      const seat = game.seats[0]!;
      // Pippin has 1 trick, one other has 2 tricks
      // myMax = 1 + 1 = 2
      // othersMin = 2
      // 2 <= 2, so guaranteed joint fewest
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "shadows", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 1 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 2 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 3 }]);
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "rings", value: s.seatIndex + 1 });
      }
      expect(game.finished).toBe(false);
      expect(Pippin.objective.isCompleted(game, seat)).toBe(true);
    });

    test("returns false when not guaranteed fewest (myMax > othersMin)", () => {
      const game = createTestGame(4);
      game.currentTrickNumber = 6; // 3 tricks remaining (9-6=3)
      const seat = game.seats[0]!;
      // Pippin has 1 trick, others have 2 tricks each
      // myMax = 1 + 3 = 4
      // othersMin = 2
      // 4 > 2, so not guaranteed fewest
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "shadows", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 1 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 2 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 1 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 2 }]);
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "rings", value: s.seatIndex + 1 });
      }
      expect(game.finished).toBe(false);
      expect(Pippin.objective.isCompleted(game, seat)).toBe(false);
    });
  });

  describe("display.renderStatus", () => {
    test("shows met=true and completable=true when tied for fewest", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = Pippin.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
      expect(status.completable).toBe(true);
    });

    test("shows met=false when not tied for fewest", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      // Pippin has 1 trick, others have 0
      const status = Pippin.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
    });

    test("shows met=false and completable=false when too far behind", () => {
      const game = createTestGame(4);
      game.currentTrickNumber = 8; // Only 1 trick remaining (9-8=1)
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "shadows", value: 2 }]);
      // Pippin has 2 tricks, others have 0, only 1 trick remaining
      const status = Pippin.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
      expect(status.completable).toBe(false);
    });

    test("shows completed=true when game finished and objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // All have same tricks
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(game.seats[1]!, [{ suit: "shadows", value: 2 }]);
      addWonCards(game.seats[2]!, [{ suit: "forests", value: 3 }]);
      addWonCards(game.seats[3]!, [{ suit: "hills", value: 4 }]);
      expect(game.finished).toBe(true);
      const status = Pippin.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
      expect(status.completed).toBe(true);
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(Pippin.name).toBe("Pippin");
    });

    test("has correct setupText", () => {
      expect(Pippin.setupText).toBe("Exchange with Frodo, Merry, or Sam");
    });
  });
});
