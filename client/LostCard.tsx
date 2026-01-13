import type { SerializedGame } from "@shared/serialized";
import { Card } from "./Card";

type LostCardProps = {
  lostCard: SerializedGame["lostCard"];
};

export function LostCard({ lostCard }: LostCardProps) {
  return (
    <section className="lost-card-section">
      <h2>Lost Card</h2>

      <div>{lostCard && <Card card={lostCard} />}</div>
    </section>
  );
}
