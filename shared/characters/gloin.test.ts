import { describe, expect, test } from "bun:test";
import { Gloin } from "./gloin";
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
  const lostCard: Card = { suit: "forests", value: 1 };
  return new Game(numCharacters, numCharacters, seats, lostCard, 0);
}

// Test helper: add won cards to a seat
function addWonCards(seat: Seat, cards: Card[]): void {
  seat.addTrick(seat.tricksWon.length, cards);
}

describe("Gloin", () => {
  describe("objective.check", () => {
    test("returns false when no mountains won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Gloin.objective.check(game, seat)).toBe(false);
    });

    test("returns true when has more mountains than all others (sole leader)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
      ]);
      expect(Gloin.objective.check(game, seat)).toBe(true);
    });

    test("returns false when tied for most mountains", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(otherSeat, [{ suit: "mountains", value: 2 }]);
      expect(Gloin.objective.check(game, seat)).toBe(false);
    });

    test("returns false when another player has more mountains", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(otherSeat, [
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
      ]);
      expect(Gloin.objective.check(game, seat)).toBe(false);
    });

    test("ignores non-mountains cards when counting", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "forests", value: 1 },
        { suit: "shadows", value: 2 },
        { suit: "hills", value: 3 },
        { suit: "rings", value: 1 },
      ]);
      expect(Gloin.objective.check(game, seat)).toBe(false);
    });

    test("counts mountains across multiple tricks", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(seat, [{ suit: "mountains", value: 2 }]);
      addWonCards(seat, [{ suit: "mountains", value: 3 }]);
      expect(Gloin.objective.check(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompletable", () => {
    test("returns true when no mountains have been won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(Gloin.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when Gloin is currently winning", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
      ]);
      expect(Gloin.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns true when Gloin can catch up with remaining mountains", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Other has 2, Gloin has 0, 6 mountains remain - Gloin can still win
      addWonCards(otherSeat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
      ]);
      expect(Gloin.objective.isCompletable(game, seat)).toBe(true);
    });

    test("returns false when others have too many mountains to overtake", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Other has 5 mountains, only 3 remain for Gloin - can't exceed 5
      addWonCards(otherSeat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
        { suit: "mountains", value: 4 },
        { suit: "mountains", value: 5 },
      ]);
      expect(Gloin.objective.isCompletable(game, seat)).toBe(false);
    });

    test("returns false when tied and no mountains remain", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Both have 4 mountains, no remaining mountains to break tie
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
        { suit: "mountains", value: 4 },
      ]);
      addWonCards(otherSeat, [
        { suit: "mountains", value: 5 },
        { suit: "mountains", value: 6 },
        { suit: "mountains", value: 7 },
        { suit: "mountains", value: 8 },
      ]);
      expect(Gloin.objective.isCompletable(game, seat)).toBe(false);
    });

    test("accounts for Gloin's current mountains when calculating", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Gloin has 2, other has 3, 3 remain - Gloin can reach 5, exceeding 3
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
      ]);
      addWonCards(otherSeat, [
        { suit: "mountains", value: 3 },
        { suit: "mountains", value: 4 },
        { suit: "mountains", value: 5 },
      ]);
      expect(Gloin.objective.isCompletable(game, seat)).toBe(true);
    });
  });

  describe("objective.isCompleted", () => {
    test("returns true when game finished and check passes", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
      ]);
      expect(game.finished).toBe(true);
      expect(Gloin.objective.isCompleted(game, seat)).toBe(true);
    });

    test("returns false when game finished but check fails", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      expect(game.finished).toBe(true);
      expect(Gloin.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true early when guaranteed to have most mountains", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      expect(game.finished).toBe(false);
      // Gloin has 6 mountains, others have 0, only 2 mountains remain
      // Others can at most get 2, so Gloin is guaranteed to have most
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
        { suit: "mountains", value: 4 },
        { suit: "mountains", value: 5 },
        { suit: "mountains", value: 6 },
      ]);
      expect(Gloin.objective.isCompleted(game, seat)).toBe(true);
    });

    test("returns false early when another player could catch up", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      expect(game.finished).toBe(false);
      // Gloin has 3, other has 2, 3 mountains remain
      // Other could get all 3 and have 5, tying or exceeding Gloin's 3
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
      ]);
      addWonCards(otherSeat, [
        { suit: "mountains", value: 4 },
        { suit: "mountains", value: 5 },
      ]);
      expect(Gloin.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns false early when tied (ties don't count as most)", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      expect(game.finished).toBe(false);
      // Both have 4 mountains, no mountains remain - a tie is not "most"
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
        { suit: "mountains", value: 4 },
      ]);
      addWonCards(otherSeat, [
        { suit: "mountains", value: 5 },
        { suit: "mountains", value: 6 },
        { suit: "mountains", value: 7 },
        { suit: "mountains", value: 8 },
      ]);
      // No mountains remain, but game not finished (has other cards in hand)
      // Gloin has 4, other has 4 - tie, so not completed
      expect(Gloin.objective.isCompleted(game, seat)).toBe(false);
    });

    test("returns true early with comfortable lead", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      // Add cards to hands so game is not finished
      for (const s of game.seats) {
        s.hand.addCard({ suit: "forests", value: s.seatIndex + 1 });
      }
      expect(game.finished).toBe(false);
      // Gloin has 5 mountains, other has 1, 2 mountains remain
      // Other could get 1+2=3, still less than 5
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
        { suit: "mountains", value: 4 },
        { suit: "mountains", value: 5 },
      ]);
      addWonCards(otherSeat, [{ suit: "mountains", value: 6 }]);
      expect(Gloin.objective.isCompleted(game, seat)).toBe(true);
    });
  });

  describe("display.renderStatus", () => {
    test("shows 'Mountains: 0' when no mountains won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const status = Gloin.display.renderStatus(game, seat);
      expect(status.details).toBe("Mountains: 0");
      expect(status.met).toBe(false);
      expect(status.completable).toBe(true);
    });

    test("shows mountains count when mountains won", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
      ]);
      const status = Gloin.display.renderStatus(game, seat);
      expect(status.details).toBe("Mountains: 3");
    });

    test("shows met=true when has most mountains", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
      ]);
      const status = Gloin.display.renderStatus(game, seat);
      expect(status.met).toBe(true);
    });

    test("shows met=false when tied for most", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(seat, [{ suit: "mountains", value: 1 }]);
      addWonCards(otherSeat, [{ suit: "mountains", value: 2 }]);
      const status = Gloin.display.renderStatus(game, seat);
      expect(status.met).toBe(false);
    });

    test("shows completable=false when cannot overtake leader", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      const otherSeat = game.seats[1]!;
      addWonCards(otherSeat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
        { suit: "mountains", value: 3 },
        { suit: "mountains", value: 4 },
        { suit: "mountains", value: 5 },
      ]);
      const status = Gloin.display.renderStatus(game, seat);
      expect(status.completable).toBe(false);
    });

    test("shows completed=true when game finished and objective met", () => {
      const game = createTestGame(4);
      const seat = game.seats[0]!;
      addWonCards(seat, [
        { suit: "mountains", value: 1 },
        { suit: "mountains", value: 2 },
      ]);
      const status = Gloin.display.renderStatus(game, seat);
      expect(status.completed).toBe(true);
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
