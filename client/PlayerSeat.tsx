import type { SerializedSeat } from "@shared/serialized";
import type {
  Card as CardType,
  ObjectiveCard,
  GamePhase,
  ObjectiveStatus,
} from "@shared/types";
import { Hand } from "./Hand";
import { Card } from "./Card";

type PlayerSeatProps = {
  seat: SerializedSeat;
  isActive: boolean;
  phase: GamePhase;
  selectableCards: CardType[];
  onSelectCard: (card: CardType) => void;
};

export function PlayerSeat({
  seat,
  isActive,
  phase,
  selectableCards,
  onSelectCard,
}: PlayerSeatProps) {
  const {
    seatIndex,
    playerName,
    character,
    setupText,
    objective,
    tricksWon,
    objectiveStatus,
    statusDetails,
    hand,
    asideCard,
    objectiveCards,
    rider,
    riderObjective,
    riderStatus,
    riderObjectiveCards,
  } = seat;

  const basePlayerName = playerName ?? `Player ${seatIndex + 1}`;
  const displayName = character ? (
    <>
      {character}
      {playerName && (
        <>
          {" "}
          <span className="seat-player-name">({playerName})</span>
        </>
      )}
    </>
  ) : (
    basePlayerName
  );

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
            <ObjectiveText
              objective={objective}
              objectiveStatus={objectiveStatus}
              statusDetails={statusDetails}
            />
          </div>
          {phase === "setup" && setupText && (
            <div className="setup-text">
              <span className="font-xs secondary italic">{setupText}</span>
            </div>
          )}
          {rider && riderObjective && (
            <div className="rider-objective">
              <StatusIcon objectiveStatus={riderStatus} />{" "}
              <span className="font-xs italic">{riderObjective}</span>
            </div>
          )}
        </div>
        {objectiveCards && objectiveCards.cards.length > 0 && (
          <ObjectiveCardsBlock cards={objectiveCards.cards} />
        )}
        {riderObjectiveCards && riderObjectiveCards.cards.length > 0 && (
          <ObjectiveCardsBlock cards={riderObjectiveCards.cards} />
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

function ObjectiveCardsBlock({ cards }: { cards: ObjectiveCard[] }) {
  return (
    <div className="objective-cards">
      {cards.map((card, i) => (
        <Card key={i} card={card} />
      ))}
    </div>
  );
}

function StatusIcon({
  objectiveStatus,
}: {
  objectiveStatus?: ObjectiveStatus;
}) {
  if (!objectiveStatus) return null;

  const { finality, outcome } = objectiveStatus;
  const isFinalSuccess = finality === "final" && outcome === "success";
  const isFinalFailure = finality === "final" && outcome === "failure";

  let icon: string;
  let colorClass: string;

  if (isFinalSuccess) {
    icon = "★";
    colorClass = "completed";
  } else if (isFinalFailure) {
    icon = "⊘";
    colorClass = "impossible";
  } else if (outcome === "success") {
    icon = "✓";
    colorClass = "success";
  } else {
    icon = "○";
    colorClass = "pending";
  }

  return <span className={`font-xs ${colorClass}`}>{icon}</span>;
}

function ObjectiveText({
  objective,
  objectiveStatus,
  statusDetails,
}: {
  objective: string;
  objectiveStatus?: ObjectiveStatus;
  statusDetails?: string;
}) {
  const isImpossible =
    objectiveStatus?.finality === "final" &&
    objectiveStatus?.outcome === "failure";

  return (
    <span
      className={`font-xs accent italic ${isImpossible ? "strikethrough" : ""}`}
    >
      {objective}
      {statusDetails && <span className="secondary"> ({statusDetails})</span>}
    </span>
  );
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
