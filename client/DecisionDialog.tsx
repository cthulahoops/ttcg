import type { DecisionRequest } from "@shared/protocol";
import { Card } from "./Card";

type DecisionDialogProps = {
  decision: DecisionRequest;
  onRespond: (response: unknown) => void;
};

export function DecisionDialog({ decision, onRespond }: DecisionDialogProps) {
  switch (decision.type) {
    case "choose_button":
      return (
        <Dialog title={decision.options.title}>
          {decision.options.buttons.map((btn) => (
            <button
              key={btn.value}
              className="primary-btn"
              onClick={() => onRespond(btn.value)}
            >
              {btn.label}
            </button>
          ))}
        </Dialog>
      );

    case "choose_card":
      return (
        <Dialog title={decision.options.title}>
          {decision.options.cards.map((card) => (
            <Card
              key={`${card.suit}-${card.value}`}
              card={card}
              clickable
              onClick={() => onRespond(card)}
            />
          ))}
        </Dialog>
      );

    case "select_card":
      // select_card is handled by making cards in the hand selectable, not via dialog
      return null;

    default:
      return null;
  }
}

type DialogProps = {
  title?: string;
  children: React.ReactNode;
};

function Dialog({ title, children }: DialogProps) {
  return (
    <section className="dialog-area">
      <div className="dialog-content">
        {title && <h3>{title}</h3>}
        <div className="dialog-buttons">{children}</div>
      </div>
    </section>
  );
}
