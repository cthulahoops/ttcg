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
    objectiveStatus,
    statusDetails,
    hand,
    asideCard,
    objectiveCards,
  } = seat;

  // Show character name when assigned, otherwise player name
  const displayName = character ?? playerName ?? `Player ${seatIndex + 1}`;

  // Destructure the tuple format: [Finality, Outcome]
  const [finality, outcome] = objectiveStatus ?? [null, null];

  // Status icon based on objective status
  const statusIcon = objectiveStatus
    ? finality === "final" && outcome === "success"
      ? "★" // [final, success] → guaranteed
      : outcome === "success"
        ? "✓" // [tentative, success] → currently met
        : "✗" // [*, failure] → not met
    : null;

  const isImpossible = finality === "final" && outcome === "failure";

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
          {objectiveStatus && (
            <>
              {finality === "final" && outcome === "success" ? (
                <span className="completed">★</span>
              ) : outcome === "success" ? (
                <span className="success">✓</span>
              ) : isImpossible ? (
                <span className="fail">✗ (impossible)</span>
              ) : (
                <span className="fail">✗</span>
              )}
              {statusDetails && ` ${statusDetails}`}
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
            {asideCard !== "hidden" && (() => {
              const isSelectable = selectableCards?.some(
                (c) => c.suit === asideCard.suit && c.value === asideCard.value
              ) ?? false;
              return (
                <Card
                  card={asideCard}
                  clickable={isSelectable}
                  onClick={isSelectable && onSelectCard ? () => onSelectCard(asideCard) : undefined}
                />
              );
            })()}
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
