import type { SerializedGame } from "@shared/serialized";
import type { DecisionRequest } from "@shared/protocol";
import type { Card } from "@shared/types";

import { TrickArea } from "./TrickArea";
import { LostCard } from "./LostCard";
import { PlayerSeat } from "./PlayerSeat";
import { GameStatus } from "./GameStatus";
import { DecisionDialog } from "./DecisionDialog";
import { AvailableCharacters } from "./AvailableCharacters";
import { LongGameProgress } from "./LongGameProgress";

type GameScreenProps = {
  game: SerializedGame;
  pendingDecision: { requestId: string; decision: DecisionRequest } | null;
  onRespond: (requestId: string, response: unknown) => void;
};

export function GameScreen({
  game,
  pendingDecision,
  onRespond,
}: GameScreenProps) {
  // In solitaire mode, rotate so Frodo appears first
  // Otherwise, rotate so viewer's seat appears first
  let rotateIndex: number;
  if (game.playerCount === 1) {
    const frodoIndex = game.seats.findIndex((s) => s.character === "Frodo");
    rotateIndex = frodoIndex === -1 ? 0 : frodoIndex;
  } else {
    rotateIndex = game.viewerSeat;
  }
  const rotatedSeats = [
    ...game.seats.slice(rotateIndex),
    ...game.seats.slice(0, rotateIndex),
  ];

  // Derive select_card decision state
  const isSelectCard = pendingDecision?.decision.type === "select_card";
  const selectableCardsFromDecision =
    isSelectCard && pendingDecision.decision.type === "select_card"
      ? pendingDecision.decision.availableCards
      : null;
  const selectCardRequestId = isSelectCard ? pendingDecision.requestId : null;

  const handleSelectCard = (card: Card) => {
    if (selectCardRequestId) {
      onRespond(selectCardRequestId, card);
    }
  };

  // Only render dialog for non-select_card decisions
  const showDialog = pendingDecision && !isSelectCard;

  return (
    <div className="main-content" id="gameScreen">
      <GameStatus game={game} pendingDecision={pendingDecision} />

      {game.longGameProgress && (
        <LongGameProgress progress={game.longGameProgress} />
      )}

      <AvailableCharacters characters={game.availableCharacters} />

      {game.drawnRider && (
        <div className="drawn-rider">
          <h3>Rider: {game.drawnRider.name}</h3>
          <p>{game.drawnRider.objective}</p>
        </div>
      )}

      {showDialog && (
        <DecisionDialog
          decision={pendingDecision.decision}
          onRespond={(response) =>
            onRespond(pendingDecision.requestId, response)
          }
        />
      )}

      <div className="display-columns">
        <TrickArea game={game} />
        <LostCard lostCard={game.lostCard} />
      </div>

      <div className="players">
        {rotatedSeats.map((seat) => {
          const isActive = seat.seatIndex === game.currentPlayer;
          // Only pass selectable cards to the active player's seat
          const selectableCards =
            isActive && selectableCardsFromDecision
              ? selectableCardsFromDecision
              : [];

          return (
            <PlayerSeat
              key={seat.seatIndex}
              seat={seat}
              isActive={isActive}
              phase={game.phase}
              selectableCards={selectableCards}
              onSelectCard={handleSelectCard}
            />
          );
        })}
      </div>
    </div>
  );
}
