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

export function PlayerSeat({
  seat,
  isActive,
  selectableCards,
  onSelectCard,
}: PlayerSeatProps) {
  const {
    seatIndex,
    playerName,
    character,
    objective,
    tricksWon,
    status,
    hand,
    asideCard,
    objectiveCards,
  } = seat;

  // Show character name when assigned, otherwise player name
  const displayName = character ?? playerName ?? `Player ${seatIndex + 1}`;

  // Compact status icon
  const statusIcon = status
    ? (() => {
        switch (status.status) {
          case "complete":
            return "★";
          case "met":
            return "✓";
          case "failed":
          case "pending":
            return "✗";
        }
      })()
    : null;

  return (
    <section
      className={`player ${isActive ? "active" : ""}`}
      data-player={seatIndex + 1}
    >
      {/* Compact header for mobile */}
      <div className="player-header-compact">
        <h3>{displayName}</h3>
        {statusIcon && <span className="compact-status">{statusIcon}</span>}
        <span className="compact-tricks">T:{tricksWon.length}</span>
        <span className="compact-objective">{objective}</span>
        {objectiveCards && objectiveCards.cards.length > 0 && (
          <div className="objective-cards-inline">
            {objectiveCards.cards.slice(0, 3).map((card, i) => (
              <Card key={i} card={card} />
            ))}
            {objectiveCards.cards.length > 3 && (
              <span className="objective-cards-overflow">
                +{objectiveCards.cards.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Full header for desktop */}
      <div className="player-header-full">
        <h3>{displayName}</h3>

        <div className="objective">{objective && `Goal: ${objective}`}</div>

        <div className="tricks-won">Tricks: {tricksWon.length}</div>

        <div className="objective-status">
          {status && (
            <>
              {(() => {
                switch (status.status) {
                  case "complete":
                    return <span className="completed">★</span>;
                  case "met":
                    return <span className="success">✓</span>;
                  case "failed":
                    return <span className="fail">✗ (impossible)</span>;
                  case "pending":
                    return <span className="fail">✗</span>;
                }
              })()}
              {status.details && ` ${status.details}`}
            </>
          )}
        </div>

        <div className="objective-cards-area">
          {objectiveCards?.cards.map((card, i) => (
            <Card key={i} card={card} />
          ))}
        </div>

        {asideCard && (
          <div className="aside-card">
            <span className="aside-label">
              {asideCard === "hidden" ? "Has card aside" : "Aside:"}
            </span>
            {asideCard !== "hidden" && <Card card={asideCard} />}
          </div>
        )}
      </div>

      {hand && (
        <Hand
          hand={hand}
          selectableCards={selectableCards}
          onSelectCard={onSelectCard}
        />
      )}
    </section>
  );
}
