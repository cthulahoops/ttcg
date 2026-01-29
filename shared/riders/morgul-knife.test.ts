import { describe, expect, test } from "bun:test";
import { MorgulKnife } from "./morgul-knife";
import { GameStateBuilder } from "../test-utils";

describe("Morgul-Knife", () => {
  describe("objective.getStatus", () => {
    test("tentative success when no tricks led yet", () => {
      const { game, seats } = new GameStateBuilder(4).build();

      expect(MorgulKnife.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("final success when game finished without leading rings", () => {
      const { game, seats } = new GameStateBuilder(4).finishGame().build();

      // Game is finished, no completedTricks with ring leads
      expect(MorgulKnife.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("tentative success when led with non-ring card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .seatWonTrick(
          0,
          [
            { suit: "mountains", value: 2 },
            { suit: "shadows", value: 3 },
            { suit: "forests", value: 4 },
            { suit: "hills", value: 5 },
          ],
          { leader: 0 }
        )
        .build();

      expect(MorgulKnife.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });
    });

    test("final failure when led with a ring card", () => {
      const { game, seats } = new GameStateBuilder(4)
        .seatWonTrick(
          0,
          [
            { suit: "rings", value: 2 },
            { suit: "shadows", value: 3 },
            { suit: "forests", value: 4 },
            { suit: "hills", value: 5 },
          ],
          { leader: 0 }
        )
        .build();

      expect(MorgulKnife.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("failure only applies to the seat that led", () => {
      const { game, seats } = new GameStateBuilder(4)
        .seatWonTrick(
          1, // seat 1 won
          [
            { suit: "rings", value: 2 },
            { suit: "shadows", value: 3 },
            { suit: "forests", value: 4 },
            { suit: "hills", value: 5 },
          ],
          { leader: 1 } // seat 1 also led with rings
        )
        .build();

      // Seat 0 didn't lead with rings, should still be success
      expect(MorgulKnife.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "tentative",
        outcome: "success",
      });

      // Seat 1 led with rings, should be failure
      expect(MorgulKnife.objective.getStatus(game, seats[1]!)).toEqual({
        finality: "final",
        outcome: "failure",
      });
    });

    test("final success when all ring cards are gone", () => {
      // All 5 ring cards won by other seats, game still in progress
      const { game, seats } = new GameStateBuilder(4)
        .seatWonCards(1, [
          { suit: "rings", value: 1 },
          { suit: "rings", value: 2 },
          { suit: "rings", value: 3 },
        ])
        .seatWonCards(2, [
          { suit: "rings", value: 4 },
          { suit: "rings", value: 5 },
        ])
        .build();

      // Seat 0 can't possibly lead with rings anymore
      expect(MorgulKnife.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });

    test("final success when ring is lost card and rest are gone", () => {
      // rings-2 is lost, other 4 ring cards won by other seats
      const { game, seats } = new GameStateBuilder(4)
        .withLostCard({ suit: "rings", value: 2 })
        .seatWonCards(1, [
          { suit: "rings", value: 1 },
          { suit: "rings", value: 3 },
        ])
        .seatWonCards(2, [
          { suit: "rings", value: 4 },
          { suit: "rings", value: 5 },
        ])
        .build();

      // Seat 0 can't possibly lead with rings anymore
      expect(MorgulKnife.objective.getStatus(game, seats[0]!)).toEqual({
        finality: "final",
        outcome: "success",
      });
    });
  });

  describe("metadata", () => {
    test("has correct name", () => {
      expect(MorgulKnife.name).toBe("Morgul-Knife");
    });

    test("has correct objective text", () => {
      expect(MorgulKnife.objective.text).toBe("Do not lead with a ring card");
    });
  });
});
