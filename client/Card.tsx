// client/components/CardView.tsx
import type { AnyCard } from "@shared/types";

type CardProps = {
  card: AnyCard | "hidden";
  clickable?: boolean;
  onClick?: () => void;
};

export function Card({ card, clickable = false, onClick }: CardProps) {
  if (card === "hidden") {
    return (
      <div className="card hidden">
        <div className="value">?</div>
      </div>
    );
  }

  return (
    <div
      className={`card ${card.suit} ${clickable ? "clickable" : ""}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="value">{card.value}</div>
      <div className="suit">{card.suit}</div>
    </div>
  );
}
