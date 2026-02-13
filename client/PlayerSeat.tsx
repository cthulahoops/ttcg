import type { SerializedSeat } from "@shared/serialized";
import type { DecisionRequest } from "@shared/protocol";
import type {
  Card as CardType,
  AnyCard,
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
  playerCount: number;
  seatDecision?: DecisionRequest; // Decision owned by this seat (choose_button or select_card)
  selectSeatDecision?: DecisionRequest & { type: "select_seat" }; // select_seat passed to all seats
  onRespond: (response: unknown) => void;
};

function isCardInHand(card: AnyCard, hand: SerializedSeat["hand"]): boolean {
  if (!hand) return false;
  const cards =
    hand.type === "pyramid"
      ? [...hand.positions.filter(Boolean), ...hand.extraCards]
      : hand.cards;
  return cards.some(
    (c) =>
      c !== null &&
      c !== "hidden" &&
      c.suit === card.suit &&
      c.value === card.value
  );
}

export function PlayerSeat({
  seat,
  isActive,
  phase,
  playerCount,
  seatDecision,
  selectSeatDecision,
  onRespond,
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

  // Determine display name based on mode and state
  const defaultName =
    playerCount === 1
      ? `Seat ${seatIndex + 1}`
      : (playerName ?? `Seat ${seatIndex + 1}`);

  const displayName = character ? (
    <>
      {character}
      {playerCount > 1 && playerName && (
        <>
          {" "}
          <span className="seat-player-name">({playerName})</span>
        </>
      )}
    </>
  ) : (
    defaultName
  );

  // Derive selectable cards and presented cards from seatDecision
  const selectableCards: CardType[] = [];
  const presentedCards: AnyCard[] = [];
  let inlineMessage: string | undefined;
  let inlineButtons: DecisionRequest | undefined;

  if (seatDecision?.type === "select_card") {
    const allCards = seatDecision.cards;
    inlineMessage = seatDecision.message;

    // Split cards: those in hand or aside are selectable inline, others are presented
    for (const card of allCards) {
      const isAside =
        asideCard != null &&
        asideCard !== "hidden" &&
        card.suit === asideCard.suit &&
        card.value === asideCard.value;
      if (card.suit !== "threat" && (isCardInHand(card, hand) || isAside)) {
        selectableCards.push(card as CardType);
      } else {
        presentedCards.push(card);
      }
    }
  } else if (seatDecision?.type === "choose_button") {
    inlineButtons = seatDecision;
  }

  // Check if this seat is eligible for select_seat
  const isEligibleForSelect =
    selectSeatDecision?.eligibleSeats.includes(seatIndex) ?? false;

  const isDeciding = seatDecision !== undefined;

  const isGameOver = phase === "gameover";
  const seatFailed =
    isGameOver &&
    ((objectiveStatus?.finality === "final" &&
      objectiveStatus?.outcome === "failure") ||
      (riderStatus?.finality === "final" &&
        riderStatus?.outcome === "failure"));
  const gameOverClass = isGameOver
    ? seatFailed
      ? "gameover-failure"
      : "gameover-success"
    : "";

  return (
    <section
      className={`player ${isActive ? "active" : ""} ${isDeciding ? "deciding" : ""} ${gameOverClass}`}
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

      {/* Inline decision area: buttons, messages, presented cards */}
      {inlineButtons?.type === "choose_button" && (
        <div className="inline-decision">
          <p className="inline-message inline-prompt-message">
            {inlineButtons.options.message}
          </p>
          <div className="inline-buttons">
            {inlineButtons.options.buttons.map((btn) => (
              <button
                key={String(btn.value)}
                className="primary-btn"
                onClick={() => onRespond(btn.value)}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {inlineMessage && !inlineButtons && (
        <p className="inline-message inline-prompt-message">{inlineMessage}</p>
      )}

      {presentedCards.length > 0 && (
        <div className="presented-cards">
          {presentedCards.map((card) => (
            <Card
              key={`${card.suit}-${card.value}`}
              card={card}
              clickable
              onClick={() => onRespond(card)}
            />
          ))}
        </div>
      )}

      {/* select_seat button */}
      {isEligibleForSelect && (
        <button
          className="seat-select-btn"
          onClick={() => onRespond(seatIndex)}
        >
          {selectSeatDecision?.buttonTemplate
            ? selectSeatDecision.buttonTemplate.replace(
                "{seat}",
                character ?? `Seat ${seatIndex + 1}`
              )
            : (character ?? `Seat ${seatIndex + 1}`)}
        </button>
      )}

      {asideCard && (
        <AsideCard
          asideCard={asideCard}
          onSelectCard={(card) => onRespond(card)}
          selectableCards={selectableCards}
        />
      )}

      {hand && (
        <Hand
          hand={hand}
          selectableCards={selectableCards}
          onSelectCard={(card) => onRespond(card)}
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
