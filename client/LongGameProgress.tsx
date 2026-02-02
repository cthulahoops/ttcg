import type { LongGameProgress as LongGameProgressType } from "@shared/protocol";

type LongGameProgressProps = {
  progress: LongGameProgressType;
};

export function LongGameProgress({ progress }: LongGameProgressProps) {
  const completedSet = new Set(progress.completedCharacters);
  // Exclude Frodo from display (always played every round)
  const displayCharacters = progress.characterPool.filter(
    (name) => name !== "Frodo"
  );

  return (
    <div className="long-game-progress">
      <h3>Campaign Progress</h3>
      <div className="round-info">Round {progress.currentRound}</div>
      <div className="character-progress">
        {displayCharacters.map((name) => (
          <span
            key={name}
            className={`character-chip ${completedSet.has(name) ? "completed" : ""}`}
          >
            {completedSet.has(name) ? "\u2713 " : ""}
            {name}
          </span>
        ))}
      </div>
      {progress.riderCompleted && (
        <div className="rider-status completed">Rider completed</div>
      )}
    </div>
  );
}
