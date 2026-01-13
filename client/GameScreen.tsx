import { useEffect } from "react";
import type { SerializedGame } from "@shared/serialized";
import type { DecisionRequest, ClientMessage } from "@shared/protocol";

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

export function GameScreen({
  game,
  pendingDecision,
  onRespond,
}: GameScreenProps) {
  return (
    <div className="main-content" id="gameScreen">
      <GameStatus game={game} />

      {pendingDecision && (
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
        {game.seats.map((seat) => (
          <PlayerSeat
            key={seat.seatIndex}
            seat={seat}
            isActive={seat.seatIndex === game.currentPlayer}
          />
        ))}
      </div>
    </div>
  );
}
