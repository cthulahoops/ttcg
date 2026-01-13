import { useEffect } from "react";
import type { SerializedGame } from "@shared/serialized";
import { updateGameDisplay } from "./display";
import { createCardElement } from "./display";

type GameScreenProps = {
  game: SerializedGame;
};

export function GameScreen({ game }: GameScreenProps) {
  useEffect(() => {
    updateGameDisplay(game, (card) =>
      card !== "hidden" ? createCardElement(card) : null,
    );
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
        {[1, 2, 3, 4].map((n) => (
          <section key={n} className="player" data-player={n}>
            <div>
              <h3 id={`playerName${n}`}>Player {n}</h3>
              <div className="objective" id={`objective${n}`} />
              <div className="tricks-won" id={`tricks${n}`}>
                Tricks: 0
              </div>
              <div className="objective-status" id={`objectiveStatus${n}`} />
              <div className="threat-card" id={`threatCard${n}`} />
            </div>
            <div className="hand" id={`player${n}`} />
          </section>
        ))}
      </div>
    </div>
  );
}
