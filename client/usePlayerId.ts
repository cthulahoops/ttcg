const STORAGE_KEY = "ttcg:playerId";

export function usePlayerId(): string {
  let playerId = localStorage.getItem(STORAGE_KEY);

  if (!playerId) {
    playerId = generateUUID();
    localStorage.setItem(STORAGE_KEY, playerId);
  }

  return playerId;
}

function generateUUID(): string {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback implementation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
