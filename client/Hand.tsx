// client/components/Hand.tsx
import type {
  SerializedPlayerHand,
  SerializedSolitaireHand,
  SerializedPyramidHand,
} from "@shared/serialized";
import { Card } from "./Card";

type HandProps = {
  hand: SerializedPlayerHand | SerializedSolitaireHand | SerializedPyramidHand;
};

export function Hand({ hand }: HandProps) {
  switch (hand.type) {
    case "player":
      return (
        <div className="hand">
          {hand.cards.map((card, idx) => (
            <Card key={idx} card={card} />
          ))}
        </div>
      );

    case "solitaire":
      return (
        <div className="hand solitaire-hand">
          {hand.cards.map((card, idx) => (
            <Card key={idx} card={card} />
          ))}
        </div>
      );

    case "pyramid":
      return <PyramidHand hand={hand} />;

    default:
      return null;
  }
}

type PyramidHandProps = {
  hand: SerializedPyramidHand;
};

function PyramidHand({ hand }: PyramidHandProps) {
  const rows = [
    { start: 0, count: 3 },
    { start: 3, count: 4 },
    { start: 7, count: 5 },
  ];

  return (
    <div className="hand pyramid-hand">
      {rows.map((row, rowIdx) =>
        Array.from({ length: row.count }).map((_, colIdx) => {
          const cardIdx = row.start + colIdx;
          const card = hand.positions[cardIdx];
          if (!card) return null;

          const style: React.CSSProperties = {
            gridRow: `${rowIdx + 1} / span 2`,
            gridColumn: `${2 * colIdx + (3 - rowIdx)} / span 2`,
          };

          return (
            <div key={cardIdx} style={style}>
              <Card card={card} />
            </div>
          );
        }),
      )}

      {hand.extraCards.map((card, idx) => {
        const style: React.CSSProperties = {
          gridRow: "3 / span 2",
          gridColumn: `${2 * (idx + 5) + 1} / span 2`,
        };

        return (
          <div key={`extra-${idx}`} className="pyramid-extra" style={style}>
            <Card card={card} />
          </div>
        );
      })}
    </div>
  );
}
