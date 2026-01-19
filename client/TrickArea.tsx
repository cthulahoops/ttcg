import { Card } from "./Card";
import type { SerializedGame, SerializedTrickPlay } from "@shared/serialized";
import type { Card as CardType } from "@shared/types";

type TrickAreaProps = {
  game: SerializedGame;
  lostCard?: CardType | null;
};

export function TrickArea({ game, lostCard }: TrickAreaProps) {
  // Show current trick if in progress, otherwise show last completed trick
  const currentTrickInProgress = game.currentTrick.length > 0;
  const lastCompletedTrick =
    game.completedTricks.length > 0
      ? game.completedTricks[game.completedTricks.length - 1]
      : null;

  const displayTrick: { plays: SerializedTrickPlay[]; winner: number | null } =
    currentTrickInProgress
      ? { plays: game.currentTrick, winner: null }
      : lastCompletedTrick
        ? { plays: lastCompletedTrick.plays, winner: lastCompletedTrick.winner }
        : { plays: [], winner: null };

  const isCompleted = !currentTrickInProgress && lastCompletedTrick !== null;

  return (
    <section className="trick-area">
      <div className="trick-header">
        <h2>{isCompleted ? "Last Trick" : "Current Trick"}</h2>
        <span
          className={`rings-status ${game.ringsBroken ? "broken" : "sealed"}`}
        >
          Rings: {game.ringsBroken ? "Broken" : "Sealed"}
        </span>
      </div>

      <div className="trick-cards">
        {displayTrick.plays.map((play, idx) => {
          const seat = game.seats[play.seatIndex];
          const name =
            seat?.character ??
            seat?.playerName ??
            `Player ${play.seatIndex + 1}`;
          const isWinner =
            isCompleted && displayTrick.winner === play.seatIndex;

          return (
            <div key={idx} className={`trick-card ${isWinner ? "winner" : ""}`}>
              <Card card={play.card} />
              <div className="player-label">{name}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
