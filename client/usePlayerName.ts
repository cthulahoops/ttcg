import { useState } from "react";

const STORAGE_KEY = "ttcg:playerName";

export function usePlayerName() {
  const [playerName, setPlayerNameState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  function setPlayerName(name: string | null) {
    if (!name) {
      localStorage.removeItem(STORAGE_KEY);
      setPlayerNameState(null);
      return;
    }
    const trimmed = name.trim();
    setPlayerNameState(trimmed);

    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return {
    playerName,
    setPlayerName,
  };
}
