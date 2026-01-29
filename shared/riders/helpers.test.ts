import { describe, expect, test } from "bun:test";
import { hasLeadWithSuit } from "./helpers";
import { GameStateBuilder } from "../test-utils";

describe("hasLeadWithSuit", () => {
  test("returns false when no tricks played", () => {
    const { game, seats } = new GameStateBuilder(4).build();

    expect(hasLeadWithSuit(game, seats[0]!, "rings")).toBe(false);
    expect(hasLeadWithSuit(game, seats[0]!, "hills")).toBe(false);
    expect(hasLeadWithSuit(game, seats[0]!, "mountains")).toBe(false);
  });

  test("returns false when game finished but no completedTricks populated", () => {
    const { game, seats } = new GameStateBuilder(4).finishGame().build();

    // Current GameStateBuilder doesn't populate completedTricks
    expect(hasLeadWithSuit(game, seats[0]!, "rings")).toBe(false);
  });

  // Tests below require GameStateBuilder extension to populate completedTricks
  // test("returns true when seat led completed trick with suit")
  // test("returns false when different seat led with suit")
  // test("checks current trick if in progress")
});
