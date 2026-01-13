import { useEffect } from "react";
import type { SerializedGame } from "@shared/serialized";
import { updateGameDisplay } from "./display";

import { TrickArea } from "./TrickArea";
import { LostCard } from "./LostCard";
import { PlayerSeat } from "./PlayerSeat";
import { GameStatus } from "./GameStatus";

type GameScreenProps = {
  game: SerializedGame;
};

export function GameScreen({ game }: GameScreenProps) {
  return (
    <div className="main-content" id="gameScreen">
      <GameStatus game={game} />

      <section className="dialog-area" id="dialogArea">
        <div className="dialog-content">
          <h3 id="dialogTitle"></h3>
          <div id="dialogMessage" className="dialog-message"></div>
          <div id="dialogChoices" className="dialog-buttons"></div>
          <div id="dialogInfo" className="dialog-info"></div>
        </div>
      </section>

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
