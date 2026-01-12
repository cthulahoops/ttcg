import { Controller } from "../shared/controllers";
import type {
  Card,
  AnyCard,
  ChoiceButtonOptions,
  ChoiceCardOptions,
} from "../shared/types";
import type { ServerMessage } from "../shared/protocol";

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

export class NetworkController extends Controller {
  private sendMessage: (message: ServerMessage) => void;
  private pendingRequests: Map<string, PendingRequest>;

  constructor(sendMessage: (message: ServerMessage) => void) {
    super();
    this.sendMessage = sendMessage;
    this.pendingRequests = new Map();
  }

  /**
   * Handle a decision response from the client
   */
  handleResponse(requestId: string, response: any): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      this.pendingRequests.delete(requestId);
      pending.resolve(response);
    }
  }

  /**
   * Send a decision request and wait for response
   */
  private async sendRequest<T>(decision: any): Promise<T> {
    const requestId = crypto.randomUUID();

    const promise = new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
    });

    this.sendMessage({
      type: "decision_request",
      requestId,
      decision,
    });

    return promise;
  }

  async chooseButton<T>(options: ChoiceButtonOptions<T>): Promise<T> {
    return this.sendRequest<T>({
      type: "choose_button",
      options,
    });
  }

  async chooseCard<T extends AnyCard = AnyCard>(
    options: ChoiceCardOptions<T>,
  ): Promise<T> {
    return this.sendRequest<T>({
      type: "choose_card",
      options,
    });
  }

  async selectCard(availableCards: Card[]): Promise<Card> {
    return this.sendRequest<Card>({
      type: "select_card",
      availableCards,
    });
  }
}
