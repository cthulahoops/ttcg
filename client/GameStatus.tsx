import type { SerializedGame } from "@shared/serialized";
import type { DecisionRequest } from "@shared/protocol";

type GameStatusProps = {
  game: SerializedGame;
  pendingDecision: { requestId: string; decision: DecisionRequest } | null;
};

export function GameStatus({ game, pendingDecision }: GameStatusProps) {
  const seat = game.seats[game.currentPlayer];
  if (!seat) return null;

  // Use decision title when available (choose_button, choose_card)
  if (pendingDecision) {
    const { decision } = pendingDecision;
    if (decision.type === "choose_button" || decision.type === "choose_card") {
      return <div className="game-status">{decision.options.title}</div>;
    }
  }

  // Default: show player's turn
  const playerName = seat.character ?? `Player ${game.currentPlayer + 1}`;
  return <div className="game-status">{playerName}'s turn</div>;
}
