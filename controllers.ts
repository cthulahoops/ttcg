import { delay, createCardElement } from "./utils";
import type { Card, ChoiceOptions } from "./types";

let currentDialogResolver: ((value: unknown) => void) | null = null;

abstract class Controller {
  async choice(_options: ChoiceOptions): Promise<unknown> {
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

  async choice({
    title,
    message,
    buttons = [],
    cards = [],
    info = "",
  }: ChoiceOptions): Promise<unknown> {
    // If only one choice, make it automatically
    if (buttons.length === 1) {
      return buttons[0].value;
    }
    if (cards.length === 1) {
      return cards[0];
    }

    return new Promise((resolve) => {
      const dialogArea = document.getElementById("dialogArea")!;
      const dialogTitle = document.getElementById("dialogTitle")!;
      const dialogMessage = document.getElementById("dialogMessage")!;
      const dialogChoices = document.getElementById("dialogChoices")!;
      const dialogInfo = document.getElementById("dialogInfo")!;

      // Store resolver for potential cleanup
      currentDialogResolver = resolve;

      // Set content
      dialogTitle.textContent = title;
      dialogMessage.textContent = message;
      dialogInfo.textContent = info;

      // Clear and populate buttons
      dialogChoices.innerHTML = "";
      if (buttons.length > 0) {
        buttons.forEach(
          ({ label, value, onClick, disabled = false }) => {
            const button = document.createElement("button");
            button.textContent = label;
            button.disabled = disabled;

            // Support both new value-based and old onClick-based patterns during transition
            button.onclick = () => {
              hideDialog();
              currentDialogResolver = null;
              if (value !== undefined) {
                resolve(value);
              } else if (onClick) {
                // Fallback for old pattern during transition
                onClick();
              }
            };
            dialogChoices.appendChild(button);
          },
        );
      }

      if (cards.length > 0) {
        cards.forEach((card) => {
          // Create DOM element from card object
          const cardElement = createCardElement(card, true, null);
          cardElement.onclick = () => {
            hideDialog();
            currentDialogResolver = null;
            resolve(card);
          };
          dialogChoices.appendChild(cardElement);
        });
      }

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
  async choice({
    buttons = [],
    cards = [],
  }: ChoiceOptions): Promise<unknown> {
    await delay(100);
    if (buttons.length > 0) {
      return randomChoice(buttons).value;
    }

    if (cards.length > 0) {
      return randomChoice(cards);
    }
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
  // Clear the resolver to prevent hanging promises
  currentDialogResolver = null;
}
