import { delay } from "./utils";
import type { AnyCard, Serializable, ChoiceButtonOptions } from "./types";
import type { Game } from "./game";
import type { Seat } from "./seat";
import type { LongGameProgress } from "./protocol";

export interface SelectCardOptions {
  forSeat?: number;
  message?: string;
}

export interface SelectSeatOptions {
  forSeat?: number;
  buttonTemplate?: string; // Use {seat} placeholder for seat label
  skipLabel?: string; // If set, show a skip button with this label
}

export abstract class Controller {
  playerName: string | null = null;

  async chooseButton<T extends Serializable>(
    _options: ChoiceButtonOptions<T>,
    _forSeat: number | undefined,
    _publicMessage: string
  ): Promise<T> {
    throw new Error("Abstract");
  }

  async selectCard<T extends AnyCard>(
    _cards: T[],
    _options: SelectCardOptions,
    _publicMessage: string
  ): Promise<T> {
    throw new Error("Abstract");
  }

  selectSeat(
    message: string,
    eligibleSeats: number[],
    options: SelectSeatOptions & { skipLabel: string },
    publicMessage: string
  ): Promise<number | null>;
  selectSeat(
    message: string,
    eligibleSeats: number[],
    options: SelectSeatOptions,
    publicMessage: string
  ): Promise<number>;
  async selectSeat(
    _message: string,
    _eligibleSeats: number[],
    _options: SelectSeatOptions,
    _publicMessage: string
  ): Promise<number | null> {
    throw new Error("Abstract");
  }

  async selectCharacter(
    _message: string,
    _characterNames: string[],
    _forSeat: number | undefined,
    _publicMessage: string
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

  async chooseButton<T extends Serializable>(
    { buttons }: ChoiceButtonOptions<T>,
    _forSeat: number | undefined,
    _publicMessage: string
  ): Promise<T> {
    await delay(this.delay);
    return randomChoice(buttons).value;
  }

  async selectCard<T extends AnyCard>(
    cards: T[],
    _options: SelectCardOptions,
    _publicMessage: string
  ): Promise<T> {
    await delay(this.delay);
    return randomChoice(cards);
  }

  async selectSeat(
    _message: string,
    eligibleSeats: number[],
    _options: SelectSeatOptions,
    _publicMessage: string
  ): Promise<number> {
    await delay(this.delay);
    return randomChoice(eligibleSeats);
  }

  async selectCharacter(
    _message: string,
    characterNames: string[],
    _forSeat: number | undefined,
    _publicMessage: string
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
    forSeat: number | undefined,
    publicMessage: string
  ): Promise<T> {
    if (!this.realController) {
      throw new Error("Controller must be assigned!");
    }
    return this.realController.chooseButton(options, forSeat, publicMessage);
  }

  selectCard<T extends AnyCard>(
    cards: T[],
    options: SelectCardOptions,
    publicMessage: string
  ): Promise<T> {
    if (!this.realController) {
      throw new Error("Controller must be assigned!");
    }
    return this.realController.selectCard(cards, options, publicMessage);
  }

  selectSeat(
    message: string,
    eligibleSeats: number[],
    options: SelectSeatOptions & { skipLabel: string },
    publicMessage: string
  ): Promise<number | null>;
  selectSeat(
    message: string,
    eligibleSeats: number[],
    options: SelectSeatOptions,
    publicMessage: string
  ): Promise<number>;
  selectSeat(
    message: string,
    eligibleSeats: number[],
    options: SelectSeatOptions,
    publicMessage: string
  ): Promise<number | null> {
    if (!this.realController) {
      throw new Error("Controller must be assigned!");
    }
    return this.realController.selectSeat(
      message,
      eligibleSeats,
      options!,
      publicMessage
    );
  }

  selectCharacter(
    message: string,
    characterNames: string[],
    forSeat: number | undefined,
    publicMessage: string
  ): Promise<string> {
    if (!this.realController) {
      throw new Error("Controller must be assigned!");
    }
    return this.realController.selectCharacter(
      message,
      characterNames,
      forSeat,
      publicMessage
    );
  }
}

function randomChoice<T>(items: T[]): T {
  if (items.length === 0) {
    throw new Error("randomChoice called with empty array");
  }
  return items[Math.floor(Math.random() * items.length)]!;
}
