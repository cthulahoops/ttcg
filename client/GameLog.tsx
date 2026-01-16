import { useEffect, useRef } from "react";

type GameLogEntry = {
  line: string;
  important: boolean;
};

type GameLogProps = {
  entries: GameLogEntry[];
};

export function GameLog({ entries }: GameLogProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = logRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [entries.length]);

  return (
    <section className="game-log" ref={logRef}>
      <CopyLogButton entries={entries} />
      {entries.map((entry, idx) => (
        <div key={idx} className={`log-entry ${entry.important ? "important" : ""}`}>
          {entry.line}
        </div>
      ))}
    </section>
  );
}

function CopyLogButton({ entries }: { entries: { line: string }[] }) {
  function copy() {
    const text = entries.map((e) => e.line).join("\n");
    navigator.clipboard.writeText(text);
  }

  return (
    <button className="copy-log-button" onClick={copy}>
      Copy Log
    </button>
  );
}
