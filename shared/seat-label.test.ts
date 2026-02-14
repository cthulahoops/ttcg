import { describe, expect, test } from "bun:test";
import type { Seat } from "./seat";
import type { SerializedSeat } from "./serialized";
import { seatLabel } from "./seat-label";

describe("seatLabel", () => {
  test("returns character name when assigned", () => {
    const seat = {
      seatIndex: 0,
      character: { name: "Frodo" },
      controller: { playerName: "Alex" },
    } as Seat;

    expect(seatLabel(seat, 4)).toBe("Frodo");
  });

  test("returns Seat N in single-player before assignment", () => {
    const seat = {
      seatIndex: 2,
      character: null,
      controller: { playerName: "Alex" },
    } as Seat;

    expect(seatLabel(seat, 1)).toBe("Seat 3");
  });

  test("returns player name in multiplayer before assignment", () => {
    const seat = {
      seatIndex: 1,
      character: null,
      playerName: "Taylor",
    } as SerializedSeat;

    expect(seatLabel(seat, 4)).toBe("Taylor");
  });

  test("falls back to Seat N in multiplayer when player name is missing", () => {
    const seat = {
      seatIndex: 3,
      character: null,
      playerName: null,
    } as SerializedSeat;

    expect(seatLabel(seat, 3)).toBe("Seat 4");
  });
});
