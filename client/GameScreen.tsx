import { useEffect } from "react";
import type { SerializedGame } from "@shared/serialized";
import { updateGameDisplay } from "./display";
import { createCardElement } from "./display";

import { Hand } from "./Hand";

type GameScreenProps = {
  game: SerializedGame;
};

export function GameScreen({ game }: GameScreenProps) {
  useEffect(() => {
    updateGameDisplay(game, (card) => createCardElement(card));
  }, [game]);

  return (
    <div className="main-content" id="gameScreen">
      <div className="game-status" id="gameStatus">
        Click "New Game" to start
      </div>

      <section className="dialog-area" id="dialogArea">
        <div className="dialog-content">
          <h3 id="dialogTitle"></h3>
          <div id="dialogMessage" className="dialog-message"></div>
          <div id="dialogChoices" className="dialog-buttons"></div>
          <div id="dialogInfo" className="dialog-info"></div>
        </div>
      </section>

      <div className="display-columns">
        <section className="trick-area">
          <h2>Current Trick</h2>
          <div className="trick-cards" id="trickCards"></div>
        </section>

        <section className="lost-card-section">
          <h2>Lost Card</h2>
          <div id="lostCard"></div>
        </section>
      </div>

      <div className="players">
        {game.seats.map((seat, n) => (
          <section key={n} className="player" data-player={n + 1}>
            <div>
              <h3 id={`playerName${n + 1}`}>Player {n + 1}</h3>
              <div className="objective" id={`objective${n + 1}`} />
              <div className="tricks-won" id={`tricks${n + 1}`}>
                Tricks: 0
              </div>
              <div
                className="objective-status"
                id={`objectiveStatus${n + 1}`}
              />
              <div className="threat-card" id={`threatCard${n + 1}`} />
            </div>

            {seat.hand && <Hand hand={seat.hand} />}
          </section>
        ))}
      </div>
    </div>
  );
}
