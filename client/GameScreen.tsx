import type { SerializedGame } from "@shared/serialized";
import type { DecisionRequest } from "@shared/protocol";
import type { Card } from "@shared/types";

import { TrickArea } from "./TrickArea";
import { LostCard } from "./LostCard";
import { PlayerSeat } from "./PlayerSeat";
import { GameStatus } from "./GameStatus";
import { DecisionDialog } from "./DecisionDialog";

type GameScreenProps = {
  game: SerializedGame;
  pendingDecision: { requestId: string; decision: DecisionRequest } | null;
  onRespond: (requestId: string, response: unknown) => void;
};

export function GameScreen({ game, pendingDecision, onRespond }: GameScreenProps) {
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
      <GameStatus game={game} />

      {showDialog && (
        <DecisionDialog
          decision={pendingDecision.decision}
          onRespond={(response) => onRespond(pendingDecision.requestId, response)}
        />
      )}

      {game.availableCharacters.length > 0 && (
        <section className="available-characters">
          <h3>Available Characters</h3>
          <div className="character-list">
            {game.availableCharacters.map((char) => (
              <div key={char.name} className="character-card">
                <div className="character-name">{char.name}</div>
                <div className="character-objective">
                  <strong>Objective:</strong> {char.objective}
                </div>
                <div className="character-setup">
                  <strong>Setup:</strong> {char.setupText}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="display-columns">
        <TrickArea game={game} />
        <LostCard lostCard={game.lostCard} />
      </div>

      <div className="players">
        {game.seats.map((seat) => {
          const isActive = seat.seatIndex === game.currentPlayer;
          // Only pass selectable cards to the active player's seat
          const selectableCards =
            isActive && selectableCardsFromDecision ? selectableCardsFromDecision : null;

          return (
            <PlayerSeat
              key={seat.seatIndex}
              seat={seat}
              isActive={isActive}
              selectableCards={selectableCards}
              onSelectCard={selectableCards ? handleSelectCard : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
