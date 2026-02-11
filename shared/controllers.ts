import { delay } from "./utils";
import type { AnyCard, Serializable, ChoiceButtonOptions } from "./types";
import type { Game } from "./game";
import type { Seat } from "./seat";
import type { LongGameProgress } from "./protocol";

export interface SelectCardOptions {
  message?: string;
  forSeat?: number;
}

export abstract class Controller {
  playerName: string | null = null;

  async chooseButton<T extends Serializable>(
    _options: ChoiceButtonOptions<T>,
    _forSeat?: number
  ): Promise<T> {
    throw new Error("Abstract");
  }

  async selectCard<T extends AnyCard>(
    _cards: T[],
    _options?: SelectCardOptions
  ): Promise<T> {
    throw new Error("Abstract");
  }

  async selectSeat(
    _message: string,
    _eligibleSeats: number[],
    _forSeat?: number
  ): Promise<number> {
    throw new Error("Abstract");
  }

  async selectCharacter(
    _message: string,
    _characterNames: string[],
    _forSeat?: number
  ): Promise<string> {
    throw new Error("Abstract");
  }

  /** Send game state to this player. No-op for non-network controllers. */
  sendGameState(
    _game: Game,
    _seat: Seat,
    _longGameProgress?: LongGameProgress
  ): void {}
}

export class AIController extends Controller {
  private delay;

  constructor(delay: number) {
    super();
    this.delay = delay;
  }

  async chooseButton<T extends Serializable>({
    buttons,
  }: ChoiceButtonOptions<T>): Promise<T> {
    await delay(this.delay);
    return randomChoice(buttons).value;
  }

  async selectCard<T extends AnyCard>(cards: T[]): Promise<T> {
    await delay(this.delay);
    return randomChoice(cards);
  }

  async selectSeat(_message: string, eligibleSeats: number[]): Promise<number> {
    await delay(this.delay);
    return randomChoice(eligibleSeats);
  }

  async selectCharacter(
    _message: string,
    characterNames: string[]
  ): Promise<string> {
    await delay(this.delay);
    return randomChoice(characterNames);
  }
}

export class ProxyController extends Controller {
  private realController: Controller | undefined;

  setController(controller: Controller) {
    this.realController = controller;
  }

  chooseButton<T extends Serializable>(
    options: ChoiceButtonOptions<T>,
    forSeat?: number
  ): Promise<T> {
    if (!this.realController) {
      throw new Error("Controller must be assigned!");
    }
    return this.realController.chooseButton(options, forSeat);
  }

  selectCard<T extends AnyCard>(
    cards: T[],
    options?: SelectCardOptions
  ): Promise<T> {
    if (!this.realController) {
      throw new Error("Controller must be assigned!");
    }
    return this.realController.selectCard(cards, options);
  }

  selectSeat(
    message: string,
    eligibleSeats: number[],
    forSeat?: number
  ): Promise<number> {
    if (!this.realController) {
      throw new Error("Controller must be assigned!");
    }
    return this.realController.selectSeat(message, eligibleSeats, forSeat);
  }

  selectCharacter(
    message: string,
    characterNames: string[],
    forSeat?: number
  ): Promise<string> {
    if (!this.realController) {
      throw new Error("Controller must be assigned!");
    }
    return this.realController.selectCharacter(
      message,
      characterNames,
      forSeat
    );
  }
}

function randomChoice<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error("randomChoice called with empty array");
  }
  return items[Math.floor(Math.random() * items.length)]!;
}
