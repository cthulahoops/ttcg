import { Card } from "./Card";
import type { SerializedGame } from "@shared/serialized";

type TrickAreaProps = {
  game: SerializedGame;
};

export function TrickArea({ game }: TrickAreaProps) {
  return (
    <section className="trick-area">
      <h2>Current Trick</h2>

      <div className="trick-cards">
        {game.currentTrick.map((play, idx) => {
          const seat = game.seats[play.seatIndex];
          const label =
            (seat.character ?? `Player ${play.seatIndex + 1}`) +
            (play.isTrump ? " (TRUMP)" : "");

          return (
            <div key={idx} className="trick-card">
              <Card card={play.card} />
              <div className="player-label">{label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
