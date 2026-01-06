import { delay, createCardElement } from "./utils.js";

let currentDialogResolver = null;

class Controller {
  async choice({ title, message, buttons = [], cards = [], info = "" }) {
    throw Exception("Abstract");
  }
}

export class HumanController extends Controller {
  async choice({ title, message, buttons = [], cards = [], info = "" }) {
    return new Promise((resolve) => {
      const dialogArea = document.getElementById("dialogArea");
      const dialogTitle = document.getElementById("dialogTitle");
      const dialogMessage = document.getElementById("dialogMessage");
      const dialogChoices = document.getElementById("dialogChoices");
      const dialogInfo = document.getElementById("dialogInfo");

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
          ({ label, value, onClick, disabled = false, grid = false }) => {
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
}

export class AIController extends Controller {
  async choice({ title, message, buttons = [], cards = [] }) {
    await delay(100);
    if (buttons.length > 0) {
      return randomChoice(buttons).value;
    }

    if (cards.length > 0) {
      return randomChoice(cards);
    }
  }
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function hideDialog() {
  document.getElementById("dialogArea").style.display = "none";
  // Clear the resolver to prevent hanging promises
  currentDialogResolver = null;
}
