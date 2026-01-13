import type { SerializedSeat } from "@shared/serialized";
import { Hand } from "./Hand";
import { Card } from "./Card";

type PlayerSeatProps = {
  seat: SerializedSeat;
  isActive: boolean;
};

export function PlayerSeat({ seat, isActive }: PlayerSeatProps) {
  const {
    seatIndex,
    character,
    objective,
    tricksWon,
    status,
    threatCard,
    hand,
  } = seat;

  const playerName = character ?? `Player ${seatIndex + 1}`;

  return (
    <section
      className={`player ${isActive ? "active" : ""}`}
      data-player={seatIndex + 1}
    >
      <div>
        <h3>{playerName}</h3>

        <div className="objective">{objective && `Goal: ${objective}`}</div>

        <div className="tricks-won">Tricks: {tricksWon.length}</div>

        <div className="objective-status">
          {status && (
            <>
              {status.met ? (
                <span className="success">✓</span>
              ) : status.completable ? (
                <span className="fail">✗</span>
              ) : (
                <span className="fail">✗ (impossible)</span>
              )}
              {status.details && ` ${status.details}`}
            </>
          )}
        </div>

        <div className="threat-card">
          {threatCard !== null && (
            <Card card={{ suit: "threat", value: threatCard }} />
          )}
        </div>
      </div>

      {hand && <Hand hand={hand} />}
    </section>
  );
}
