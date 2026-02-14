import type { SerializedSeat } from "./serialized";
import type { Seat } from "./seat";

export function seatLabel(seat: Seat, playerCount: number): string;
export function seatLabel(seat: SerializedSeat, playerCount: number): string;
export function seatLabel(
  seat: Seat | SerializedSeat,
  playerCount: number
): string {
  if (seat.character) {
    return typeof seat.character === "string"
      ? seat.character
      : seat.character.name;
  }

  if (playerCount === 1) {
    return `Seat ${seat.seatIndex + 1}`;
  }

  const playerName =
    "controller" in seat ? seat.controller.playerName : seat.playerName;
  return playerName ?? `Seat ${seat.seatIndex + 1}`;
}
