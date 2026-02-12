import { Controller } from "../shared/controllers";
import type {
  SelectCardOptions,
  SelectSeatOptions,
} from "../shared/controllers";
import type {
  AnyCard,
  Serializable,
  ChoiceButtonOptions,
} from "../shared/types";
import type {
  ServerMessage,
  DecisionRequest,
  LongGameProgress,
} from "../shared/protocol";
import type { Game } from "../shared/game";
import type { Seat } from "../shared/seat";
import { serializeGameForSeat } from "../shared/serialize";
import type { SerializedDecisionStatus } from "../shared/serialized";

interface PendingRequest<T = unknown> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  requestId: string;
  decision: DecisionRequest;
}

export class NetworkController extends Controller {
  readonly playerId: string;
  seatIndex: number = 0; // Set after game creation as fallback
  onDecisionStatusChange?: (status: SerializedDecisionStatus | null) => void;
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
      this.onDecisionStatusChange?.(null);
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
    this.onDecisionStatusChange?.(toDecisionStatus(decision));
    this.sendMessage({
      type: "decision_request",
      requestId,
      decision,
    });

    return promise;
  }

  async chooseButton<T extends Serializable>(
    options: ChoiceButtonOptions<T>,
    forSeat?: number
  ): Promise<T> {
    return this.sendRequest<T>({
      type: "choose_button",
      seatIndex: forSeat,
      options,
    });
  }

  async selectCard<T extends AnyCard>(
    cards: T[],
    options?: SelectCardOptions
  ): Promise<T> {
    return this.sendRequest<T>({
      type: "select_card",
      seatIndex: options?.forSeat ?? this.seatIndex,
      cards,
      message: options?.message,
    });
  }

  selectSeat(
    message: string,
    eligibleSeats: number[],
    options: SelectSeatOptions & { skipLabel: string }
  ): Promise<number | null>;
  selectSeat(
    message: string,
    eligibleSeats: number[],
    options?: SelectSeatOptions
  ): Promise<number>;
  selectSeat(
    message: string,
    eligibleSeats: number[],
    options?: SelectSeatOptions
  ): Promise<number | null> {
    return this.sendRequest<number | null>({
      type: "select_seat",
      seatIndex: options?.forSeat ?? this.seatIndex,
      message,
      eligibleSeats,
      buttonTemplate: options?.buttonTemplate,
      skipLabel: options?.skipLabel,
    });
  }

  async selectCharacter(
    message: string,
    _characterNames: string[],
    forSeat?: number
  ): Promise<string> {
    return this.sendRequest<string>({
      type: "select_character",
      seatIndex: forSeat ?? this.seatIndex,
      message,
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

function toDecisionStatus(decision: DecisionRequest): SerializedDecisionStatus {
  switch (decision.type) {
    case "choose_button":
      return {
        seatIndex: decision.seatIndex,
        action: "choose_button",
        message: summarizeChooseButtonDecision(
          decision.options.title,
          decision.options.message
        ),
      };
    case "select_card":
      return {
        seatIndex: decision.seatIndex,
        action: "select_card",
        message: summarizeSelectCardDecision(decision.message),
      };
    case "select_seat":
      return {
        seatIndex: decision.seatIndex,
        action: "select_seat",
        message: summarizeSelectSeatDecision(decision.message),
      };
    case "select_character":
      return {
        seatIndex: decision.seatIndex,
        action: "select_character",
        message: summarizeSelectCharacterDecision(decision.message),
      };
  }
}

function summarizeChooseButtonDecision(
  title?: string,
  message?: string
): string {
  const normalizedTitle = title?.toLowerCase() ?? "";
  const normalizedMessage = message?.toLowerCase() ?? "";

  if (
    normalizedTitle.includes("you played the 1 of rings") ||
    normalizedMessage.includes("use it as trump")
  ) {
    return "deciding whether to use the 1 of Rings as trump";
  }

  if (
    normalizedTitle.includes("threat card drawn") ||
    normalizedMessage.includes("keep or redraw")
  ) {
    return "deciding whether to keep or redraw a threat card";
  }

  if (
    normalizedTitle.includes("lost card") ||
    normalizedMessage.includes("take the lost card")
  ) {
    return "deciding whether to take the lost card";
  }

  if (
    normalizedTitle.includes("exchange?") ||
    normalizedMessage.includes("to exchange")
  ) {
    return "deciding whether to exchange";
  }

  if (
    normalizedTitle.includes("game over") ||
    normalizedMessage.includes("play again")
  ) {
    return "deciding whether to play again";
  }

  if (
    normalizedTitle.includes("round complete") ||
    normalizedMessage.includes("continue campaign")
  ) {
    return "deciding whether to continue the campaign";
  }

  return "making a choice";
}

function summarizeSelectCardDecision(message?: string): string {
  if (!message) {
    return "playing a card";
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("set aside")) {
    return "choosing a card to set aside";
  }

  if (normalized.includes("threat card")) {
    return "choosing a threat card";
  }

  if (normalized.includes("exchange with the lost card")) {
    return "choosing a card to exchange with the lost card";
  }

  if (
    normalized.includes("you received") &&
    normalized.includes("choose a card to give")
  ) {
    return "choosing a card to return in an exchange";
  }

  if (normalized.includes("to pass to the player on your right")) {
    return "choosing a card to pass right";
  }

  if (normalized.includes("choose a card to give")) {
    return "choosing a card to give";
  }

  return "choosing a card";
}

function summarizeSelectSeatDecision(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("exchange with")) {
    return "choosing who to exchange with";
  }

  if (normalized.includes("leads the next trick")) {
    return "choosing who leads the next trick";
  }

  if (normalized.includes("assign") && normalized.includes("to a character")) {
    return "choosing who receives a rider";
  }

  return "choosing a player";
}

function summarizeSelectCharacterDecision(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("select a character")) {
    return "choosing a character";
  }

  return "choosing a role";
}
