import { describe, expect, test } from "bun:test";
import { sortHand, shuffleDeck, statusFromBooleans } from "./utils";
import type { Card } from "./types";

describe("sortHand", () => {
  test("sorts cards by suit order (mountains < shadows < forests < hills < rings)", () => {
    const cards: Card[] = [
      { suit: "rings", value: 1 },
      { suit: "forests", value: 1 },
      { suit: "mountains", value: 1 },
      { suit: "hills", value: 1 },
      { suit: "shadows", value: 1 },
    ];

    const sorted = sortHand(cards);

    expect(sorted.map((c) => c.suit)).toEqual([
      "mountains",
      "shadows",
      "forests",
      "hills",
      "rings",
    ]);
  });

  test("sorts cards within same suit by value ascending", () => {
    const cards: Card[] = [
      { suit: "mountains", value: 5 },
      { suit: "mountains", value: 1 },
      { suit: "mountains", value: 8 },
      { suit: "mountains", value: 3 },
    ];

    const sorted = sortHand(cards);

    expect(sorted.map((c) => c.value)).toEqual([1, 3, 5, 8]);
  });

  test("sorts mixed cards by suit first, then value", () => {
    const cards: Card[] = [
      { suit: "shadows", value: 3 },
      { suit: "mountains", value: 7 },
      { suit: "shadows", value: 1 },
      { suit: "mountains", value: 2 },
      { suit: "rings", value: 5 },
    ];

    const sorted = sortHand(cards);

    expect(sorted).toEqual([
      { suit: "mountains", value: 2 },
      { suit: "mountains", value: 7 },
      { suit: "shadows", value: 1 },
      { suit: "shadows", value: 3 },
      { suit: "rings", value: 5 },
    ]);
  });

  test("handles empty array", () => {
    const sorted = sortHand([]);
    expect(sorted).toEqual([]);
  });

  test("handles single card", () => {
    const cards: Card[] = [{ suit: "forests", value: 4 }];
    const sorted = sortHand(cards);
    expect(sorted).toEqual([{ suit: "forests", value: 4 }]);
  });
});

describe("shuffleDeck", () => {
  test("preserves all elements", () => {
    const deck = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = shuffleDeck(deck);

    expect(shuffled.length).toBe(deck.length);
    expect(shuffled.sort((a, b) => a - b)).toEqual(deck);
  });

  test("does not modify original array", () => {
    const original = [1, 2, 3, 4, 5];
    const copy = [...original];
    shuffleDeck(original);

    expect(original).toEqual(copy);
  });

  test("returns a new array", () => {
    const deck = [1, 2, 3];
    const shuffled = shuffleDeck(deck);

    expect(shuffled).not.toBe(deck);
  });

  test("handles empty array", () => {
    const shuffled = shuffleDeck([]);
    expect(shuffled).toEqual([]);
  });

  test("handles single element", () => {
    const shuffled = shuffleDeck([42]);
    expect(shuffled).toEqual([42]);
  });

  test("works with Card objects", () => {
    const cards: Card[] = [
      { suit: "mountains", value: 1 },
      { suit: "shadows", value: 2 },
      { suit: "forests", value: 3 },
    ];
    const shuffled = shuffleDeck(cards);

    expect(shuffled.length).toBe(3);
    expect(shuffled).toContainEqual({ suit: "mountains", value: 1 });
    expect(shuffled).toContainEqual({ suit: "shadows", value: 2 });
    expect(shuffled).toContainEqual({ suit: "forests", value: 3 });
  });
});

describe("statusFromBooleans", () => {
  test("returns 'complete' when completed is true", () => {
    expect(statusFromBooleans(true, true, true)).toBe("complete");
    expect(statusFromBooleans(false, true, true)).toBe("complete");
    expect(statusFromBooleans(true, false, true)).toBe("complete");
    expect(statusFromBooleans(false, false, true)).toBe("complete");
  });

  test("returns 'failed' when not completable and not completed", () => {
    expect(statusFromBooleans(false, false, false)).toBe("failed");
    expect(statusFromBooleans(true, false, false)).toBe("failed");
  });

  test("returns 'met' when met is true, completable is true, and not completed", () => {
    expect(statusFromBooleans(true, true, false)).toBe("met");
  });

  test("returns 'pending' when met is false, completable is true, and not completed", () => {
    expect(statusFromBooleans(false, true, false)).toBe("pending");
  });

  test("respects priority: completed > failed > met > pending", () => {
    // completed wins over everything
    expect(statusFromBooleans(false, false, true)).toBe("complete");

    // failed wins over met and pending
    expect(statusFromBooleans(true, false, false)).toBe("failed");

    // met wins over pending
    expect(statusFromBooleans(true, true, false)).toBe("met");
  });
});
