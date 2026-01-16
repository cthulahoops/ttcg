export function addToGameLog(message: string, important: boolean = false): void {
  const logDiv = document.getElementById("gameLog")!;
  const entry = document.createElement("div");
  entry.className = "log-entry" + (important ? " important" : "");
  entry.textContent = message;
  logDiv.appendChild(entry);

  // Auto-scroll to bottom
  logDiv.scrollTop = logDiv.scrollHeight;
}

export function clearGameLog(): void {
  document.getElementById("gameLog")!.innerHTML = "";
}

export function copyGameLog(): void {
  const logDiv = document.getElementById("gameLog")!;
  const logEntries = Array.from(logDiv.querySelectorAll(".log-entry"));
  const logText = logEntries.map((entry) => entry.textContent).join("\n");

  navigator.clipboard.writeText(logText).then(
    () => {
      const button = document.querySelector(".copy-log-button") as HTMLButtonElement;
      const originalText = button.textContent;
      button.textContent = "Copied!";
      setTimeout(() => {
        button.textContent = originalText;
      }, 1500);
    },
    (err) => {
      console.error("Failed to copy log:", err);
    }
  );
}
