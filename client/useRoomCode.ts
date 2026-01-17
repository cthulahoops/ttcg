import { useEffect, useState } from "react";

function parseRoomCode(): string | null {
  const hash = window.location.hash.replace("#", "");
  if (hash.length === 4) {
    return hash.toUpperCase();
  }
  return null;
}

export function useRoomCode() {
  const [roomCode, setRoomCode] = useState<string | null>(() =>
    parseRoomCode()
  );

  // Keep state in sync with back/forward navigation
  useEffect(() => {
    function onHashChange() {
      setRoomCode(parseRoomCode());
    }

    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  function set(code: string) {
    const normalized = code.toUpperCase();
    window.location.hash = normalized;
    setRoomCode(normalized);
  }

  function clear() {
    window.location.hash = "";
    setRoomCode(null);
  }

  return {
    roomCode,
    setRoomCode: set,
    clearRoomCode: clear,
  };
}
