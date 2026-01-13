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
    <div className="game-log" ref={logRef}>
      {entries.map((entry, idx) => (
        <div
          key={idx}
          className={`log-entry ${entry.important ? "important" : ""}`}
        >
          {entry.line}
        </div>
      ))}
    </div>
  );
}

type CopyLogButtonProps = {
  entries: { line: string }[];
};

function CopyLogButton({ entries }: CopyLogButtonProps) {
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
