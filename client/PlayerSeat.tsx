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
    hand,
    asideCard,
    objectiveCards,
  } = seat;

  // Show character name when assigned, otherwise player name
  const displayName = character ?? playerName ?? `Player ${seatIndex + 1}`;

  // Destructure the object format: { finality, outcome }
  const { finality, outcome } = objectiveStatus ?? {
    finality: null,
    outcome: null,
  };

  // Status icon based on objective status
  const statusIcon = objectiveStatus
    ? finality === "final" && outcome === "success"
      ? "★" // final success → guaranteed
      : outcome === "success"
        ? "✓" // tentative success → currently met
        : "✗" // failure → not met
    : null;

  return (
    <section
      className={`player ${isActive ? "active" : ""}`}
      data-player={seatIndex + 1}
    >
      <div className="player-header">
        <div className="player-info">
          <h3>
            {displayName}
            {statusIcon && <span className="compact-status">{statusIcon}</span>}
            <span className="compact-tricks">T:{tricksWon.length}</span>
          </h3>
          <span className="compact-objective">{objective}</span>
        </div>
        {objectiveCards && objectiveCards.cards.length > 0 && (
          <div className="objective-cards">
            {objectiveCards.cards.map((card, i) => (
              <Card key={i} card={card} />
            ))}
          </div>
        )}
      </div>

      {asideCard && (
        <AsideCard
          asideCard={asideCard}
          onSelectCard={onSelectCard}
          selectableCards={selectableCards}
        />
      )}

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

function AsideCard({
  asideCard,
  onSelectCard,
  selectableCards,
}: {
  asideCard: CardType | "hidden";
  selectableCards?: CardType[] | null;
  onSelectCard?: (card: CardType) => void;
}) {
  if (asideCard === "hidden") {
    return <Card card="hidden" />;
  }
  const isSelectable =
    selectableCards?.some(
      (c) => c.suit === asideCard.suit && c.value === asideCard.value
    ) ?? false;

  return (
    <Card
      card={asideCard}
      clickable={isSelectable}
      onClick={
        isSelectable && onSelectCard ? () => onSelectCard(asideCard) : undefined
      }
    />
  );
}
