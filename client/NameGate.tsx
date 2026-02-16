import { useState } from "react";

type NameGateProps = {
  roomCode: string;
  onSubmit: (playerName: string) => void;
  onBack: () => void;
};

export function NameGate({ roomCode, onSubmit, onBack }: NameGateProps) {
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const trimmed = playerName.trim();
    if (!trimmed) {
      setError("Please enter your name");
      return;
    }

    setError(null);
    onSubmit(trimmed);
  }

  return (
    <div className="lobby-menu">
      <h2>Join Room {roomCode}</h2>

      <div className="lobby-form">
        <input
          type="text"
          placeholder="Your Name"
          maxLength={20}
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />

        <button type="button" className="primary-btn" onClick={handleSubmit}>
          Continue
        </button>

        <button type="button" className="secondary-btn" onClick={onBack}>
          Back
        </button>
      </div>

      {error && <div className="lobby-error">{error}</div>}
    </div>
  );
}
