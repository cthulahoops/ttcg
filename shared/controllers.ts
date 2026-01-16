import { delay } from "./utils";
import type { Card, AnyCard, ChoiceButtonOptions, ChoiceCardOptions } from "./types";
import type { Game } from "./game";
import type { Seat } from "./seat";

export abstract class Controller {
  playerName: string | null = null;

  async chooseButton<T>(_options: ChoiceButtonOptions<T>): Promise<T> {
    throw new Error("Abstract");
  }

  async chooseCard<T extends AnyCard = AnyCard>(_options: ChoiceCardOptions<T>): Promise<T> {
    throw new Error("Abstract");
  }

  async selectCard(_availableCards: Card[]): Promise<Card> {
    throw new Error("Abstract");
  }

  /** Send game state to this player. No-op for non-network controllers. */
  sendGameState(_game: Game, _seat: Seat): void {}
}

export class AIController extends Controller {
  private delay;

  constructor(delay: number) {
    super();
    this.delay = delay;
  }

  async chooseButton<T>({ buttons }: ChoiceButtonOptions<T>): Promise<T> {
    await delay(this.delay);
    return randomChoice(buttons).value;
  }

  async chooseCard<T extends AnyCard = AnyCard>({ cards }: ChoiceCardOptions<T>): Promise<T> {
    await delay(this.delay);
    return randomChoice(cards);
  }

  async selectCard(availableCards: Card[]): Promise<Card> {
    await delay(this.delay);
    return randomChoice(availableCards);
  }
}

export class ProxyController extends Controller {
  private realController: Controller | undefined;

  setController(controller: Controller) {
    this.realController = controller;
  }

  chooseButton<T>(options: ChoiceButtonOptions<T>): Promise<T> {
    if (!this.realController) {
      throw new Error("Controller must be assigned!");
    }
    return this.realController.chooseButton(options);
  }

  chooseCard<T extends AnyCard = AnyCard>(options: ChoiceCardOptions<T>): Promise<T> {
    if (!this.realController) {
      throw new Error("Controller must be assigned!");
    }
    return this.realController.chooseCard(options);
  }

  selectCard(availableCards: Card[]): Promise<Card> {
    if (!this.realController) {
      throw new Error("Controller must be assigned!");
    }
    return this.realController.selectCard(availableCards);
  }
}

function randomChoice<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error("randomChoice called with empty array");
  }
  return items[Math.floor(Math.random() * items.length)]!;
}
