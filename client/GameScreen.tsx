import type { SerializedGame } from "@shared/serialized";
import type { DecisionRequest } from "@shared/protocol";

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

  const decision = pendingDecision?.decision;
  const rawSeatIndex =
    decision && "seatIndex" in decision ? decision.seatIndex : undefined;
  // For select_card without seatIndex, fall back to viewer's seat
  // (mirrors NetworkController.selectCard which uses this.seatIndex as fallback)
  const decisionSeatIndex =
    rawSeatIndex === undefined && decision?.type === "select_card"
      ? game.viewerSeat
      : rawSeatIndex;

  const handleRespond = (response: unknown) => {
    if (pendingDecision) {
      onRespond(pendingDecision.requestId, response);
    }
  };

  // Determine what kind of decision routing we need
  const isSelectCharacter = decision?.type === "select_character";
  const isSelectSeat = decision?.type === "select_seat";
  const isTopLevelDialog =
    pendingDecision && decisionSeatIndex === undefined && !isSelectCharacter;

  // Use decision seatIndex for active highlighting when available
  const activeSeatIndex =
    decisionSeatIndex !== undefined ? decisionSeatIndex : game.currentPlayer;

  return (
    <div className="main-content" id="gameScreen">
      <GameStatus game={game} pendingDecision={pendingDecision} />

      {game.longGameProgress && (
        <LongGameProgress progress={game.longGameProgress} />
      )}

      <AvailableCharacters
        characters={game.availableCharacters}
        selectCharacterDecision={isSelectCharacter ? decision : undefined}
        onRespond={handleRespond}
      />

      {game.drawnRider && (
        <div className="drawn-rider">
          <h3>Rider: {game.drawnRider.name}</h3>
          <p>{game.drawnRider.objective}</p>
        </div>
      )}

      {isTopLevelDialog && (
        <DecisionDialog
          decision={pendingDecision.decision}
          onRespond={handleRespond}
        />
      )}

      <div className="display-columns">
        <TrickArea game={game} />
        <LostCard lostCard={game.lostCard} />
      </div>

      <div className="players">
        {rotatedSeats.map((seat) => {
          const isActive = seat.seatIndex === activeSeatIndex;

          // Build seat-specific decision if this seat owns it
          const seatDecision =
            decisionSeatIndex === seat.seatIndex &&
            !isSelectSeat &&
            !isSelectCharacter
              ? decision
              : undefined;

          // For select_seat, pass to all seats so eligible ones show buttons
          const selectSeatDecision =
            isSelectSeat && decision.type === "select_seat"
              ? decision
              : undefined;

          return (
            <PlayerSeat
              key={seat.seatIndex}
              seat={seat}
              isActive={isActive}
              phase={game.phase}
              seatDecision={seatDecision}
              selectSeatDecision={selectSeatDecision}
              onRespond={handleRespond}
            />
          );
        })}
      </div>

      {isSelectSeat &&
        decision.type === "select_seat" &&
        decision.skipLabel && (
          <div className="select-seat-skip">
            <button className="primary-btn" onClick={() => handleRespond(null)}>
              {decision.skipLabel}
            </button>
          </div>
        )}
    </div>
  );
}
