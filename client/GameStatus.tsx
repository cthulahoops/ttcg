import type { SerializedGame, SerializedSeat } from "@shared/serialized";

type GameStatusProps = {
  game: SerializedGame;
};

export function GameStatus({ game }: GameStatusProps) {
  const seat = game.seats[game.currentPlayer];
  if (!seat) return null;

  if (game.currentDecisionStatus) {
    const { seatIndex, message } = game.currentDecisionStatus;
    const actorLabel =
      seatIndex !== undefined ? getActorLabel(game.seats[seatIndex]) : null;
    return (
      <div className="game-status">
        {actorLabel ? `${actorLabel} is ${message}` : `A player is ${message}`}
      </div>
    );
  }

  // Default: show player's turn
  const playerName = seat.character ?? `Seat ${game.currentPlayer + 1}`;
  return <div className="game-status">{playerName}'s turn</div>;
}

function getActorLabel(seat?: SerializedSeat): string {
  if (!seat) return "Unknown seat";
  return seat.character ?? `Seat ${seat.seatIndex + 1}`;
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
      <FailedObjectives failedSeats={failedSeats} failedRiders={failedRiders} />
    </div>
  );
}

function FailedObjectives({
  failedSeats,
  failedRiders,
}: {
  failedSeats: SerializedSeat[];
  failedRiders: SerializedSeat[];
}) {
  return (
    <div className="failed-objectives">
      {failedSeats.map((seat) => (
        <div key={seat.seatIndex} className="failed-objective">
          {seat.character ?? "Unknown"}: {seat.objective}
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
