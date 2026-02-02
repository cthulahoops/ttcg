import { Controller } from "../shared/controllers";
import type {
  Card,
  AnyCard,
  Serializable,
  ChoiceButtonOptions,
  ChoiceCardOptions,
} from "../shared/types";
import type {
  ServerMessage,
  DecisionRequest,
  LongGameProgress,
} from "../shared/protocol";
import type { Game } from "../shared/game";
import type { Seat } from "../shared/seat";
import { serializeGameForSeat } from "../shared/serialize";

interface PendingRequest<T = unknown> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  requestId: string;
  decision: DecisionRequest;
}

export class NetworkController extends Controller {
  readonly playerId: string;
  private sendMessage: (message: ServerMessage) => void;
  // Using PendingRequest<unknown> since requests store heterogeneous response types
  private pendingRequests: Map<string, PendingRequest<unknown>>;

  constructor(
    sendMessage: (message: ServerMessage) => void,
    playerId: string,
    playerName: string
  ) {
    super();
    this.playerId = playerId;
    this.sendMessage = sendMessage;
    this.pendingRequests = new Map();
    this.playerName = playerName;
  }

  /**
   * Handle a decision response from the client
   */
  handleResponse(requestId: string, response: unknown): void {
    const pending = this.pendingRequests.get(requestId);
    if (pending) {
      console.log(
        `[NetworkController] Received response for request ${requestId}, remaining pending: ${this.pendingRequests.size - 1}`
      );
      this.pendingRequests.delete(requestId);
      pending.resolve(response);
    } else {
      console.log(
        `[NetworkController] Received response for unknown request ${requestId}`
      );
    }
  }

  /**
   * Resend all pending decision requests
   * Called when a player reconnects to ensure they receive any decisions they missed
   */
  resendPendingRequests(): void {
    console.log(
      `[NetworkController] Resending ${this.pendingRequests.size} pending requests`
    );
    for (const pending of this.pendingRequests.values()) {
      console.log(
        `[NetworkController] Resending request ${pending.requestId} with decision type: ${pending.decision?.type}`
      );
      this.sendMessage({
        type: "decision_request",
        requestId: pending.requestId,
        decision: pending.decision,
      });
    }
  }

  /**
   * Send a decision request and wait for response
   */
  private async sendRequest<T>(decision: DecisionRequest): Promise<T> {
    const requestId = crypto.randomUUID();

    const promise = new Promise<T>((resolve, reject) => {
      // Type assertion needed: we store heterogeneous request types in the same map,
      // and the response type T is validated at runtime by the calling code
      this.pendingRequests.set(requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        requestId,
        decision,
      });
    });

    console.log(
      `[NetworkController] Sending decision request ${requestId}, type: ${decision?.type}, total pending: ${this.pendingRequests.size}`
    );
    this.sendMessage({
      type: "decision_request",
      requestId,
      decision,
    });

    return promise;
  }

  async chooseButton<T extends Serializable>(
    options: ChoiceButtonOptions<T>
  ): Promise<T> {
    return this.sendRequest<T>({
      type: "choose_button",
      options,
    });
  }

  async chooseCard<T extends AnyCard = AnyCard>(
    options: ChoiceCardOptions<T>
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

  /**
   * Send game state to this player
   */
  override sendGameState(
    game: Game,
    seat: Seat,
    longGameProgress?: LongGameProgress
  ): void {
    const state = serializeGameForSeat(game, seat.seatIndex, longGameProgress);
    this.sendMessage({
      type: "game_state",
      state,
    });
  }
}
