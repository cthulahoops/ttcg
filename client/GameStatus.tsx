import type { SerializedGame, SerializedSeat } from "@shared/serialized";
import { seatLabel } from "@shared/seat-label";

type GameStatusProps = {
  game: SerializedGame;
};

export function GameStatus({ game }: GameStatusProps) {
  const seat = game.seats[game.currentPlayer];
  if (!seat) return null;

  if (game.currentDecisionStatus) {
    const { seatIndex, message } = game.currentDecisionStatus;
    const actorLabel =
      seatIndex !== undefined
        ? getActorLabel(game.seats[seatIndex], game.playerCount)
        : null;
    return (
      <div className="game-status">
        {actorLabel ? `${actorLabel} is ${message}` : `A player is ${message}`}
      </div>
    );
  }

  // Default: show player's turn
  const playerName = seatLabel(seat, game.playerCount);
  return <div className="game-status">{playerName}'s turn</div>;
}

function getActorLabel(
  seat: SerializedSeat | undefined,
  playerCount: number
): string {
  if (!seat) return "Unknown seat";
  return seatLabel(seat, playerCount);
}

export function GameOverStatus({
  game,
  isVictory,
}: {
  game: SerializedGame;
  isVictory: boolean;
}) {
  if (isVictory) {
    return <div className="game-status victory">Victory!</div>;
  }

  const failedSeats = game.seats.filter(
    (seat) => seat.objectiveStatus?.outcome === "failure"
  );

  const failedRiders = game.seats.filter(
    (seat) => seat.riderStatus?.outcome === "failure"
  );

  return (
    <div className="game-status defeat">
      <div>Defeat</div>
      <FailedObjectives
        failedSeats={failedSeats}
        failedRiders={failedRiders}
        playerCount={game.playerCount}
      />
    </div>
  );
}

function FailedObjectives({
  failedSeats,
  failedRiders,
  playerCount,
}: {
  failedSeats: SerializedSeat[];
  failedRiders: SerializedSeat[];
  playerCount: number;
}) {
  return (
    <div className="failed-objectives">
      {failedSeats.map((seat) => (
        <div key={seat.seatIndex} className="failed-objective">
          {seatLabel(seat, playerCount)}: {seat.objective}
        </div>
      ))}
      {failedRiders.map((seat) => (
        <div key={`rider-${seat.seatIndex}`} className="failed-objective">
          {seat.rider ?? "Rider"}: {seat.riderObjective}
        </div>
      ))}
    </div>
  );
}
