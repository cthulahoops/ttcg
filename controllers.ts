import { delay, createCardElement } from "./utils";
import type { Card, ChoiceButtonOptions, ChoiceCardOptions } from "./types";

abstract class Controller {
  async chooseButton<T>(_options: ChoiceButtonOptions<T>): Promise<T> {
    throw new Error("Abstract");
  }

  async chooseCard(_options: ChoiceCardOptions): Promise<Card> {
    throw new Error("Abstract");
  }

  async selectCard(
    _availableCards: Card[],
    _renderCards: () => void,
  ): Promise<Card> {
    throw new Error("Abstract");
  }
}

export class HumanController extends Controller {
  private _cardSelectionResolver: ((card: Card) => void) | null;

  constructor() {
    super();
    this._cardSelectionResolver = null;
  }

  async chooseButton<T>({
    title,
    message,
    buttons,
    info = "",
  }: ChoiceButtonOptions<T>): Promise<T> {
    // If only one choice, make it automatically
    if (buttons.length === 1) {
      return buttons[0].value;
    }

    return new Promise((resolve) => {
      const dialogArea = document.getElementById("dialogArea")!;
      const dialogTitle = document.getElementById("dialogTitle")!;
      const dialogMessage = document.getElementById("dialogMessage")!;
      const dialogChoices = document.getElementById("dialogChoices")!;
      const dialogInfo = document.getElementById("dialogInfo")!;

      // Set content
      dialogTitle.textContent = title;
      dialogMessage.textContent = message;
      dialogInfo.textContent = info;

      // Clear and populate buttons
      dialogChoices.innerHTML = "";
      buttons.forEach(({ label, value, onClick, disabled = false }) => {
        const button = document.createElement("button");
        button.textContent = label;
        button.disabled = disabled;

        // Support both new value-based and old onClick-based patterns during transition
        button.onclick = () => {
          hideDialog();
          if (value !== undefined) {
            resolve(value);
          } else if (onClick) {
            // Fallback for old pattern during transition
            onClick();
          }
        };
        dialogChoices.appendChild(button);
      });

      // Show dialog
      dialogArea.style.display = "block";
    });
  }

  async chooseCard({
    title,
    message,
    cards,
    info = "",
  }: ChoiceCardOptions): Promise<Card> {
    // If only one choice, make it automatically
    if (cards.length === 1) {
      return cards[0];
    }

    return new Promise((resolve) => {
      const dialogArea = document.getElementById("dialogArea")!;
      const dialogTitle = document.getElementById("dialogTitle")!;
      const dialogMessage = document.getElementById("dialogMessage")!;
      const dialogChoices = document.getElementById("dialogChoices")!;
      const dialogInfo = document.getElementById("dialogInfo")!;

      // Set content
      dialogTitle.textContent = title;
      dialogMessage.textContent = message;
      dialogInfo.textContent = info;

      // Clear and populate cards
      dialogChoices.innerHTML = "";
      cards.forEach((card) => {
        // Create DOM element from card object
        const cardElement = createCardElement(card, true, null);
        cardElement.onclick = () => {
          hideDialog();
          resolve(card);
        };
        dialogChoices.appendChild(cardElement);
      });

      // Show dialog
      dialogArea.style.display = "block";
    });
  }

  async selectCard(
    availableCards: Card[],
    renderCards: () => void,
  ): Promise<Card> {
    // If only one card available, select it automatically
    if (availableCards.length === 1) {
      return availableCards[0];
    }

    // Render cards with selection enabled
    renderCards();

    return new Promise((resolve) => {
      // Store resolver to be called when user clicks a card
      this._cardSelectionResolver = resolve;
    });
  }

  resolveCardSelection(card: Card): void {
    if (this._cardSelectionResolver) {
      const resolver = this._cardSelectionResolver;
      this._cardSelectionResolver = null;
      resolver(card);
    }
  }
}

export class AIController extends Controller {
  async chooseButton<T>({ buttons }: ChoiceButtonOptions<T>): Promise<T> {
    await delay(100);
    return randomChoice(buttons).value;
  }

  async chooseCard({ cards }: ChoiceCardOptions): Promise<Card> {
    await delay(100);
    return randomChoice(cards);
  }

  async selectCard(availableCards: Card[]): Promise<Card> {
    // AI doesn't need to render - callbacks not needed
    await delay(800);
    return randomChoice(availableCards);
  }
}

function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function hideDialog(): void {
  document.getElementById("dialogArea")!.style.display = "none";
}
