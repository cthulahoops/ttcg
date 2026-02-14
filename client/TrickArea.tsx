import { Card } from "./Card";
import type { SerializedGame, SerializedTrickPlay } from "@shared/serialized";
import { seatLabel } from "@shared/seat-label";

type TrickAreaProps = {
  game: SerializedGame;
};

export function TrickArea({ game }: TrickAreaProps) {
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

  // Determine lead suit for styling
  const leadSuit = currentTrickInProgress
    ? game.leadSuit
    : (displayTrick.plays[0]?.card.suit ?? null);

  return (
    <section className={`trick-area${leadSuit ? ` ${leadSuit}` : ""}`}>
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
          const name = seat
            ? seatLabel(seat, game.playerCount)
            : `Seat ${play.seatIndex + 1}`;
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
