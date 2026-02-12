import type { SerializedGame, SerializedSeat } from "@shared/serialized";

type GameStatusProps = {
  game: SerializedGame;
};

export function GameStatus({ game }: GameStatusProps) {
  // Game over - show victory/defeat
  if (game.phase === "gameover") {
    return <GameOverStatus game={game} />;
  }

  // Show decision-specific status messages from game state
  if (game.pendingDecision) {
    const decidingSeat = game.seats[game.pendingDecision.seatIndex];
    const playerName =
      decidingSeat?.character ?? `Player ${game.pendingDecision.seatIndex + 1}`;
    return (
      <div className="game-status">
        {playerName}: {game.pendingDecision.message}
      </div>
    );
  }

  // Default: show current player's turn
  const seat = game.seats[game.currentPlayer];
  if (!seat) return null;
  const playerName = seat.character ?? `Player ${game.currentPlayer + 1}`;
  return <div className="game-status">{playerName}'s turn</div>;
}

function GameOverStatus({ game }: { game: SerializedGame }) {
  // Check which characters failed (final failure)
  const failedSeats = game.seats.filter(
    (seat) =>
      seat.objectiveStatus?.finality === "final" &&
      seat.objectiveStatus?.outcome === "failure"
  );

  // Also check rider objectives
  const failedRiders = game.seats.filter(
    (seat) =>
      seat.riderStatus?.finality === "final" &&
      seat.riderStatus?.outcome === "failure"
  );

  const isVictory = failedSeats.length === 0 && failedRiders.length === 0;

  if (isVictory) {
    return <div className="game-status victory">Victory!</div>;
  }

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
