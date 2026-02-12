import type { SerializedGame, SerializedSeat } from "@shared/serialized";
import type { DecisionRequest } from "@shared/protocol";

type GameStatusProps = {
  game: SerializedGame;
  pendingDecision: { requestId: string; decision: DecisionRequest } | null;
};

export function GameStatus({ game, pendingDecision }: GameStatusProps) {
  // Game over - show victory/defeat
  if (game.phase === "gameover") {
    return <GameOverStatus game={game} />;
  }

  const seat = game.seats[game.currentPlayer];
  if (!seat) return null;

  // Show decision-specific status messages
  if (pendingDecision) {
    const { decision } = pendingDecision;
    const hasSeatIndex =
      "seatIndex" in decision && decision.seatIndex !== undefined;

    if (!hasSeatIndex && decision.type === "choose_button") {
      return <div className="game-status">{decision.options.title}</div>;
    }

    if (decision.type === "select_seat") {
      return <div className="game-status">{decision.message}</div>;
    }

    if (decision.type === "select_character") {
      const decidingSeat = game.seats[decision.seatIndex];
      const seatLabel =
        decidingSeat?.playerName ?? `Player ${decision.seatIndex + 1}`;
      return <div className="game-status">{seatLabel}: Choose a character</div>;
    }
  }

  // Show waiting-for status when another player is deciding
  if (game.waitingFor) {
    const waitingSeat = game.seats[game.waitingFor.seatIndex];
    const name =
      waitingSeat?.character ??
      waitingSeat?.playerName ??
      `Player ${game.waitingFor.seatIndex + 1}`;
    return (
      <div className="game-status">
        {name}: {game.waitingFor.description}
      </div>
    );
  }

  // Default: show player's turn
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
