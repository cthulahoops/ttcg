import { describe, expect, test } from "bun:test";
import {
  tricksWinnable,
  leadsWinnable,
  cardsWinnable,
  tricksWithCardsWinnable,
} from "./objectives";
import { GameStateBuilder } from "./test-utils";

describe("tricksWinnable", () => {
  test("counts current trick as winnable when seat has played a card", () => {
    const { game, seats } = new GameStateBuilder(4)
      .seatWonTricks(1, 2)
      .seatWonTricks(2, 2)
      .seatWonTricks(3, 2)
      .build();

    // Seat 0 has won 0 tricks, we're at trick 6 (3 remaining: 6, 7, 8).
    game.currentTrickNumber = 6;
    // Simulate seat 0 having played a card in the current trick.
    const playedCard = seats[0]!.hand.getAvailableCards()[0]!;
    seats[0]!.hand.removeCard(playedCard);
    game.currentTrick = [{ playerIndex: 0, card: playedCard, isTrump: false }];

    const result = tricksWinnable(game, seats[0]!);
    expect(result.current).toBe(0);
    // Can win: current trick (already played) + 2 more (2 cards in hand)
    expect(result.max).toBe(3);
  });

  test("max does not exceed tricksRemaining", () => {
    const { game, seats } = new GameStateBuilder(4)
      .seatWonTricks(1, 3)
      .seatWonTricks(2, 2)
      .seatWonTricks(3, 2)
      .build();

    // 2 tricks remaining, seat has 2 cards in hand.
    game.currentTrickNumber = 7;
    const result = tricksWinnable(game, seats[0]!);
    expect(result.max).toBe(2);
  });
});

describe("leadsWinnable", () => {
  test("counts current trick lead in current", () => {
    const { game, seats } = new GameStateBuilder(4)
      .seatWonTricks(1, 2)
      .seatWonTricks(2, 2)
      .seatWonTricks(3, 2)
      .build();

    game.currentTrickNumber = 6;
    // Seat 0 leads the current trick with a hills card.
    const hillsCard = seats[0]!.hand
      .getAvailableCards()
      .find((c) => c.suit === "hills")!;
    seats[0]!.hand.removeCard(hillsCard);
    game.currentTrick = [{ playerIndex: 0, card: hillsCard, isTrump: false }];

    const result = leadsWinnable(game, seats[0]!, (c) => c.suit === "hills");
    // Current trick counts as a matching lead.
    expect(result.current).toBe(1);
    // Max: current (1) + future leads possible (2 more tricks to win and lead).
    // Should NOT double-count the current trick.
    expect(result.max).toBeLessThanOrEqual(3);
    expect(result.max).toBeGreaterThanOrEqual(result.current);
  });

  test("does not count current trick as an extra future lead opportunity", () => {
    const { game, seats } = new GameStateBuilder(4)
      .seatWonTricks(1, 3)
      .seatWonTricks(2, 2)
      .seatWonTricks(3, 2)
      .build();

    // 2 tricks remaining (7, 8). Seat 0 played in current trick (7).
    game.currentTrickNumber = 7;
    const hillsCard = seats[0]!.hand
      .getAvailableCards()
      .find((c) => c.suit === "hills")!;
    seats[0]!.hand.removeCard(hillsCard);
    game.currentTrick = [{ playerIndex: 0, card: hillsCard, isTrump: false }];

    const result = leadsWinnable(game, seats[0]!, (c) => c.suit === "hills");
    // current=1 (leading current trick), max future wins = 1 (trick 8).
    // max should be at most current + 1 = 2 (not current + 2 = 3).
    expect(result.current).toBe(1);
    expect(result.max).toBeLessThanOrEqual(2);
  });
});

describe("cardsWinnable", () => {
  test("includes current trick cards as winnable on last card played", () => {
    const targetCard = { suit: "forests" as const, value: 3 };
    const { game, seats } = new GameStateBuilder(4)
      .seatWonTricks(0, 1)
      .seatWonTricks(1, 3)
      .seatWonTricks(2, 2)
      .seatWonTricks(3, 2)
      .reserveToHand(1, [targetCard])
      .build();

    // Trick 8 (the last one). Seat 0 plays their only remaining card.
    const lastCard = seats[0]!.hand.getAvailableCards()[0]!;
    seats[0]!.hand.removeCard(lastCard);
    seats[1]!.hand.removeCard(targetCard);
    game.currentTrick = [
      { playerIndex: 0, card: lastCard, isTrump: false },
      { playerIndex: 1, card: targetCard, isTrump: false },
    ];

    const result = cardsWinnable(
      game,
      seats[0]!,
      (c) => c.suit === targetCard.suit && c.value === targetCard.value
    );
    // The target card is in the current trick, not won yet → in remaining.
    // With 0 cards in hand but 1 trick remaining, maxTricksWinnableFromHere
    // must account for the card already played.
    expect(result.max).toBeGreaterThanOrEqual(1);
  });
});

describe("tricksWithCardsWinnable", () => {
  test("includes current trick as potential win on last card played", () => {
    const targetCard = { suit: "hills" as const, value: 5 };
    const { game, seats } = new GameStateBuilder(4)
      .seatWonTricks(0, 1)
      .seatWonTricks(1, 3)
      .seatWonTricks(2, 2)
      .seatWonTricks(3, 2)
      .reserveToHand(1, [targetCard])
      .build();

    // Trick 8 (the last one). Seat 0 plays their only remaining card.
    const lastCard = seats[0]!.hand.getAvailableCards()[0]!;
    seats[0]!.hand.removeCard(lastCard);
    seats[1]!.hand.removeCard(targetCard);
    game.currentTrick = [
      { playerIndex: 0, card: lastCard, isTrump: false },
      { playerIndex: 1, card: targetCard, isTrump: false },
    ];

    const result = tricksWithCardsWinnable(
      game,
      seats[0]!,
      (c) => c.suit === "hills"
    );
    // Current trick has a hills card. Seat could win it.
    // max should be current + 1, not current + 0.
    expect(result.max).toBe(result.current + 1);
  });
});
