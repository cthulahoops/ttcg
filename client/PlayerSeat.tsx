import type { SerializedSeat } from "@shared/serialized";
import type { Card as CardType } from "@shared/types";
import { Hand } from "./Hand";
import { Card } from "./Card";

type PlayerSeatProps = {
  seat: SerializedSeat;
  isActive: boolean;
  selectableCards: CardType[];
  onSelectCard: (card: CardType) => void;
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

  return (
    <section
      className={`player ${isActive ? "active" : ""}`}
      data-player={seatIndex + 1}
    >
      <div className="player-header">
        <div className="player-info">
          <h3>{displayName}</h3>
          <div>
            <span className="font-xs secondary">{tricksWon.length}</span>{" "}
            <StatusIcon objectiveStatus={objectiveStatus} />{" "}
            <span className="font-xs accent italic">{objective}</span>
          </div>
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

function StatusIcon({
  objectiveStatus,
}: {
  objectiveStatus?: { finality: string; outcome: string };
}) {
  if (!objectiveStatus) return null;

  const { finality, outcome } = objectiveStatus;
  const isFinalSuccess = finality === "final" && outcome === "success";
  const icon = isFinalSuccess ? "★" : outcome === "success" ? "✓" : "✗";
  const colorClass = isFinalSuccess
    ? "completed"
    : outcome === "success"
      ? "success"
      : "error";

  return <span className={`font-xs ${colorClass}`}>{icon}</span>;
}

function AsideCard({
  asideCard,
  onSelectCard,
  selectableCards,
}: {
  asideCard: CardType | "hidden";
  selectableCards: CardType[];
  onSelectCard: (card: CardType) => void;
}) {
  if (asideCard === "hidden") {
    return <Card card="hidden" />;
  }
  const isSelectable = selectableCards.some(
    (c) => c.suit === asideCard.suit && c.value === asideCard.value
  );

  return (
    <Card
      card={asideCard}
      clickable={isSelectable}
      onClick={isSelectable ? () => onSelectCard(asideCard) : undefined}
    />
  );
}
