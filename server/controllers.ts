import { Controller } from "../shared/controllers";
import type {
  Card,
  AnyCard,
  ChoiceButtonOptions,
  ChoiceCardOptions,
} from "../shared/types";

export class NetworkController extends Controller {
  async chooseButton<T>(_options: ChoiceButtonOptions<T>): Promise<T> {
    throw new Error("Not implemented");
  }

  async chooseCard<T extends AnyCard = AnyCard>(
    _options: ChoiceCardOptions<T>,
  ): Promise<T> {
    throw new Error("Not implemented");
  }

  async selectCard(_availableCards: Card[]): Promise<Card> {
    throw new Error("Not implemented");
  }
}
