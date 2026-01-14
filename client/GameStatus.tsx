import type { SerializedGame } from "@shared/serialized";

type GameStatusProps = {
  game: SerializedGame;
};

export function GameStatus({ game }: GameStatusProps) {
  const seat = game.seats[game.currentPlayer];
  if (!seat) return null;
  const playerName = seat.character ?? `Player ${game.currentPlayer + 1}`;

  return <div className="game-status">{playerName}'s turn</div>;
}
