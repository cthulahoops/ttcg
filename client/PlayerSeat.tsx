import { useState } from "react";
import type { SerializedSeat } from "@shared/serialized";
import type { Card as CardType } from "@shared/types";
import { Hand } from "./Hand";
import { Card } from "./Card";

type PlayerSeatProps = {
  seat: SerializedSeat;
  isActive: boolean;
  selectableCards?: CardType[] | null;
  onSelectCard?: (card: CardType) => void;
};

export function PlayerSeat({ seat, isActive, selectableCards, onSelectCard }: PlayerSeatProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const {
    seatIndex,
    playerName,
    character,
    objective,
    tricksWon,
    status,
    threatCard,
    hand,
  } = seat;

  // Show character name when assigned, otherwise player name
  const displayName = character ?? playerName ?? `Player ${seatIndex + 1}`;

  // Compact status icon
  const statusIcon = status
    ? status.completed
      ? "★"
      : status.met
        ? "✓"
        : "✗"
    : null;

  return (
    <section className={`player ${isActive ? "active" : ""}`} data-player={seatIndex + 1}>
      {/* Compact header for mobile */}
      <div className="player-header-compact">
        <h3>{displayName}</h3>
        {statusIcon && <span className="compact-status">{statusIcon}</span>}
        <span className="compact-tricks">T:{tricksWon.length}</span>
        <button
          className="info-toggle"
          onClick={() => setDetailsExpanded(!detailsExpanded)}
          aria-expanded={detailsExpanded}
        >
          {detailsExpanded ? "−" : "i"}
        </button>
        {threatCard !== null && (
          <div className="threat-card-inline">
            <Card card={{ suit: "threat", value: threatCard }} />
          </div>
        )}
      </div>

      {/* Expandable details for mobile */}
      <div className={`player-details ${detailsExpanded ? "expanded" : ""}`}>
        <div className="objective">{objective && `Goal: ${objective}`}</div>
        <div className="objective-status">
          {status && (
            <>
              {status.completed ? (
                <span className="completed">★</span>
              ) : status.met ? (
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
      </div>

      {/* Full header for desktop */}
      <div className="player-header-full">
        <h3>{displayName}</h3>

        <div className="objective">{objective && `Goal: ${objective}`}</div>

        <div className="tricks-won">Tricks: {tricksWon.length}</div>

        <div className="objective-status">
          {status && (
            <>
              {status.completed ? (
                <span className="completed">★</span>
              ) : status.met ? (
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

        <div className="threat-card-area">
          {threatCard !== null && <Card card={{ suit: "threat", value: threatCard }} />}
        </div>
      </div>

      {hand && <Hand hand={hand} selectableCards={selectableCards} onSelectCard={onSelectCard} />}
    </section>
  );
}
