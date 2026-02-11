import type { DecisionRequest } from "@shared/protocol";

type DecisionDialogProps = {
  decision: DecisionRequest;
  onRespond: (response: unknown) => void;
};

export function DecisionDialog({ decision, onRespond }: DecisionDialogProps) {
  switch (decision.type) {
    case "choose_button":
      return (
        <Dialog
          title={decision.options.title}
          message={decision.options.message}
        >
          {decision.options.buttons.map((btn) => (
            <button
              key={String(btn.value)}
              className="primary-btn"
              onClick={() => onRespond(btn.value)}
            >
              {btn.label}
            </button>
          ))}
        </Dialog>
      );

    // select_card, select_seat, select_character are handled inline
    case "select_card":
    case "select_seat":
    case "select_character":
      return null;

    default:
      return null;
  }
}

type DialogProps = {
  title?: string;
  message?: string;
  children: React.ReactNode;
};

function Dialog({ title, message, children }: DialogProps) {
  return (
    <section className="dialog-area">
      <div className="dialog-content">
        {title && <h3>{title}</h3>}
        {message && <p className="dialog-message">{message}</p>}
        <div className="dialog-buttons">{children}</div>
      </div>
    </section>
  );
}
