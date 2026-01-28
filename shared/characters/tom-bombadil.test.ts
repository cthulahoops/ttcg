import { describe, expect, test } from "bun:test";
import { TomBombadil } from "./tom-bombadil";
import { GameStateBuilder } from "../test-utils";

describe("Tom Bombadil", () => {
  describe("objective.getStatus", () => {
    test("returns { final, failure } when no cards in hand (game finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(TomBombadil.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when cards in hand but no cards won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .build();

      // Game not finished means seats have cards in hand
      expect(game.finished).toBe(false);
      expect(TomBombadil.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when won cards don't match suit in hand", () => {
      // Won mountains cards, but need to ensure hand has non-mountains cards
      // The builder distributes remaining cards round-robin to hands
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .seatWonCards(0, [
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
          { suit: "mountains", value: 4 },
        ])
        // Other seats win all remaining mountains so Tom's hand has no mountains
        .seatWonCards(1, [
          { suit: "mountains", value: 5 },
          { suit: "mountains", value: 6 },
          { suit: "mountains", value: 7 },
          { suit: "mountains", value: 8 },
        ])
        .build();

      // Tom has won 3 mountains but his hand likely has no mountains
      // (all mountains either won or used as lost card)
      expect(TomBombadil.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when only 2 cards of matching suit won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .seatWonCards(0, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
        ])
        .build();

      // Tom won 2 forests - clear hand and add only a forests card
      // to test the "not yet met but completable" state
      const availableCards = seats[0]!.hand.getAvailableCards();
      for (const card of availableCards) {
        seats[0]!.hand.removeCard(card);
      }
      seats[0]!.hand.addCard({ suit: "forests", value: 8 });

      expect(TomBombadil.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, success } when exactly 3 cards of matching suit won (game not finished)", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .seatWonCards(0, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
          { suit: "forests", value: 4 },
        ])
        .build();

      // Tom won 3 forests, will have some forests in hand from distribution
      expect(game.finished).toBe(false);
      expect(TomBombadil.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, success } when exactly 3 cards of matching suit won (game finished)", () => {
      // Manually add a forests card to Tom's hand after building
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .seatWonCards(0, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
          { suit: "forests", value: 3 },
        ])
        .finishGame()
        .build();

      // Add a forests card to Tom's hand so the objective can be evaluated
      seats[0]!.hand.addCard({ suit: "forests", value: 8 });

      expect(game.finished).toBe(true);
      expect(TomBombadil.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when more than 3 cards of matching suit won", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .seatWonCards(0, [
          { suit: "hills", value: 1 },
          { suit: "hills", value: 2 },
          { suit: "hills", value: 3 },
          { suit: "hills", value: 4 },
        ])
        .build();

      expect(game.finished).toBe(false);
      expect(TomBombadil.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { tentative, success } when any card in hand matches won suit", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .seatWonCards(0, [
          { suit: "forests", value: 3 },
          { suit: "forests", value: 4 },
          { suit: "forests", value: 5 },
        ])
        .build();

      // Remaining forests will be distributed to hands, so Tom will have some
      expect(TomBombadil.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("counts cards across multiple tricks", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .seatWonCards(0, [{ suit: "shadows", value: 1 }])
        .seatWonCards(0, [{ suit: "shadows", value: 2 }])
        .seatWonCards(0, [{ suit: "shadows", value: 3 }])
        .build();

      expect(TomBombadil.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("works with rings suit", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .seatWonCards(0, [
          { suit: "rings", value: 2 },
          { suit: "rings", value: 3 },
          { suit: "rings", value: 4 },
        ])
        .build();

      // Need to ensure Tom has a rings card in hand
      // Clear any existing cards and add a rings card
      const availableCards = seats[0]!.hand.getAvailableCards();
      for (const card of availableCards) {
        seats[0]!.hand.removeCard(card);
      }
      seats[0]!.hand.addCard({ suit: "rings", value: 5 });

      expect(TomBombadil.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("returns { final, failure } when others have won too many cards of suits in hand", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        // Other player has won 6 forests (only 2 remain, Tom needs 3)
        .seatWonCards(1, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
          { suit: "forests", value: 3 },
          { suit: "forests", value: 4 },
          { suit: "forests", value: 5 },
          { suit: "forests", value: 6 },
        ])
        .build();

      // Clear Tom's hand and add only a forests card
      const availableCards = seats[0]!.hand.getAvailableCards();
      for (const card of availableCards) {
        seats[0]!.hand.removeCard(card);
      }
      seats[0]!.hand.addCard({ suit: "forests", value: 8 });

      expect(TomBombadil.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("considers all suits in hand when checking completability", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        // Other player has won most forests but mountains are available
        .seatWonCards(1, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
          { suit: "forests", value: 3 },
          { suit: "forests", value: 4 },
          { suit: "forests", value: 5 },
        ])
        .build();

      // Tom has both forests and mountains in hand
      const availableCards = seats[0]!.hand.getAvailableCards();
      for (const card of availableCards) {
        seats[0]!.hand.removeCard(card);
      }
      seats[0]!.hand.addCard({ suit: "forests", value: 8 });
      seats[0]!.hand.addCard({ suit: "mountains", value: 7 });

      // Still completable via mountains (forests has only 3 remaining, but mountains has 7+)
      expect(TomBombadil.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { tentative, failure } when Tom has won some cards toward goal", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .seatWonCards(0, [
          { suit: "hills", value: 1 },
          { suit: "hills", value: 2 },
        ])
        .build();

      // Clear hand and add a hills card to test the "not yet met but completable" state
      const availableCards = seats[0]!.hand.getAvailableCards();
      for (const card of availableCards) {
        seats[0]!.hand.removeCard(card);
      }
      seats[0]!.hand.addCard({ suit: "hills", value: 8 });

      // Tom has 2 hills, needs 1 more, plenty available
      expect(TomBombadil.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "failure",
      });
    });

    test("returns { final, failure } when game finished but no cards in hand", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .seatWonCards(0, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
          { suit: "forests", value: 3 },
        ])
        .finishGame()
        .build();

      expect(game.finished).toBe(true);
      expect(TomBombadil.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });
  });

  describe("objective.getDetails", () => {
    test("shows suit counts >= 2", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .seatWonCards(0, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
        ])
        .build();

      const details = TomBombadil.objective.getDetails!(game, seats[0]!);
      expect(details).toContain(":2");
    });

    test("shows multiple suits in details when both >= 2", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .seatWonCards(0, [
          { suit: "forests", value: 1 },
          { suit: "forests", value: 2 },
          { suit: "mountains", value: 2 },
          { suit: "mountains", value: 3 },
        ])
        .build();

      const details = TomBombadil.objective.getDetails!(game, seats[0]!);
      expect(details).toContain(":2");
    });

    test("returns undefined when no suit has >= 2 cards", () => {
      const { game, seats } = new GameStateBuilder(4)
        .setCharacter(0, "Tom Bombadil")
        .seatWonCards(0, [{ suit: "forests", value: 1 }])
        .build();

      // Clear the seat's won tricks and add back just one card
      // to test the case where no suit has >= 2 cards
      seats[0]!.tricksWon = [];
      seats[0]!.addTrick(0, [{ suit: "forests", value: 1 }]);

      const details = TomBombadil.objective.getDetails!(game, seats[0]!);
      expect(details).toBeUndefined();
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(TomBombadil.name).toBe("Tom Bombadil");
    });

    test("has correct setupText", () => {
      expect(TomBombadil.setupText).toBe(
        "Take the lost card, then exchange with Frodo"
      );
    });

    test("has correct objective text", () => {
      expect(TomBombadil.objective.text).toBe(
        "Win 3 or more cards matching the suit of a card left in hand at the end of round"
      );
    });
  });
});
