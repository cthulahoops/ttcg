import { Controller } from "../shared/controllers.js";
import { createCardElement } from "./utils.js";
import type {
  Card,
  AnyCard,
  ChoiceButtonOptions,
  ChoiceCardOptions,
} from "../shared/types.js";

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
    return new Promise((resolve) => {
      const dialogArea = document.getElementById("dialogArea")!;
      const dialogTitle = document.getElementById("dialogTitle")!;
      const dialogMessage = document.getElementById("dialogMessage")!;
      const dialogChoices = document.getElementById("dialogChoices")!;
      const dialogInfo = document.getElementById("dialogInfo")!;

      dialogTitle.textContent = title;
      dialogMessage.textContent = message;
      dialogInfo.textContent = info;

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

      dialogArea.style.display = "block";
    });
  }

  async chooseCard<T extends AnyCard = AnyCard>({
    title,
    message,
    cards,
    info = "",
  }: ChoiceCardOptions<T>): Promise<T> {
    return new Promise((resolve) => {
      const dialogArea = document.getElementById("dialogArea")!;
      const dialogTitle = document.getElementById("dialogTitle")!;
      const dialogMessage = document.getElementById("dialogMessage")!;
      const dialogChoices = document.getElementById("dialogChoices")!;
      const dialogInfo = document.getElementById("dialogInfo")!;

      dialogTitle.textContent = title;
      dialogMessage.textContent = message;
      dialogInfo.textContent = info;

      dialogChoices.innerHTML = "";
      cards.forEach((card) => {
        const cardElement = createCardElement(card, true, null);
        cardElement.onclick = () => {
          hideDialog();
          resolve(card);
        };
        dialogChoices.appendChild(cardElement);
      });

      dialogArea.style.display = "block";
    });
  }

  async selectCard(
    availableCards: Card[],
    renderCards: () => void,
  ): Promise<Card> {
    if (availableCards.length === 1) {
      // return availableCards[0];
    }

    renderCards();

    return new Promise((resolve) => {
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

function hideDialog(): void {
  document.getElementById("dialogArea")!.style.display = "none";
}
