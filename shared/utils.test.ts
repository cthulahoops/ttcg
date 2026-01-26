import { describe, expect, test } from "bun:test";
import { sortHand, shuffleDeck, bothAchieved } from "./utils";
import type { Card, ObjectiveStatus } from "./types";

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

describe("bothAchieved", () => {
  const TF: ObjectiveStatus = { finality: "tentative", outcome: "failure" };
  const TS: ObjectiveStatus = { finality: "tentative", outcome: "success" };
  const FF: ObjectiveStatus = { finality: "final", outcome: "failure" };
  const FS: ObjectiveStatus = { finality: "final", outcome: "success" };

  test("both tentative failure → tentative failure", () => {
    expect(bothAchieved(TF, TF)).toEqual(TF);
  });

  test("tentative failure + tentative success → tentative failure", () => {
    expect(bothAchieved(TF, TS)).toEqual(TF);
    expect(bothAchieved(TS, TF)).toEqual(TF);
  });

  test("both tentative success → tentative success", () => {
    expect(bothAchieved(TS, TS)).toEqual(TS);
  });

  test("final failure + anything → final failure", () => {
    expect(bothAchieved(FF, TF)).toEqual(FF);
    expect(bothAchieved(FF, TS)).toEqual(FF);
    expect(bothAchieved(FF, FF)).toEqual(FF);
    expect(bothAchieved(FF, FS)).toEqual(FF);
    // Commutative
    expect(bothAchieved(TF, FF)).toEqual(FF);
    expect(bothAchieved(TS, FF)).toEqual(FF);
    expect(bothAchieved(FS, FF)).toEqual(FF);
  });

  test("final success + tentative failure → tentative failure", () => {
    expect(bothAchieved(FS, TF)).toEqual(TF);
    expect(bothAchieved(TF, FS)).toEqual(TF);
  });

  test("final success + tentative success → tentative success", () => {
    expect(bothAchieved(FS, TS)).toEqual(TS);
    expect(bothAchieved(TS, FS)).toEqual(TS);
  });

  test("both final success → final success", () => {
    expect(bothAchieved(FS, FS)).toEqual(FS);
  });
});
