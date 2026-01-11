// ===== CLIENT-SPECIFIC UTILITY FUNCTIONS =====
// (DOM functions - only for browser)

import type { AnyCard } from "../shared/types.js";
// Re-export pure utilities from shared
export { delay, sortHand, shuffleDeck } from "../shared/utils.js";

export function createCardElement(
  card: AnyCard,
  clickable = false,
  clickHandler: (() => void) | null = null,
): HTMLDivElement {
  const cardDiv = document.createElement("div");
  cardDiv.className = `card ${card.suit}`;
  if (clickable) {
    cardDiv.classList.add("clickable");
    if (clickHandler) {
      cardDiv.onclick = clickHandler;
    }
  }

  const valueDiv = document.createElement("div");
  valueDiv.className = "value";
  valueDiv.textContent = card.value.toString();

  const suitDiv = document.createElement("div");
  suitDiv.className = "suit";
  suitDiv.textContent = card.suit;

  cardDiv.appendChild(valueDiv);
  cardDiv.appendChild(suitDiv);

  return cardDiv;
}
