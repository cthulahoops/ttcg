// client/components/Hand.tsx
import type {
  SerializedPlayerHand,
  SerializedSolitaireHand,
  SerializedPyramidHand,
} from "@shared/serialized";
import type { Card as CardType } from "@shared/types";
import { Card } from "./Card";

type HandProps = {
  hand: SerializedPlayerHand | SerializedSolitaireHand | SerializedPyramidHand;
  selectableCards?: CardType[] | null;
  onSelectCard?: (card: CardType) => void;
};

function isCardSelectable(
  card: CardType | "hidden",
  selectableCards?: CardType[] | null,
): card is CardType {
  if (!selectableCards || card === "hidden") return false;
  return selectableCards.some(
    (c) => c.suit === card.suit && c.value === card.value,
  );
}

export function Hand({ hand, selectableCards, onSelectCard }: HandProps) {
  switch (hand.type) {
    case "player":
      return (
        <div className="hand">
          {hand.cards.map((card, idx) => {
            const selectable = isCardSelectable(card, selectableCards);
            return (
              <Card
                key={idx}
                card={card}
                clickable={selectable}
                onClick={
                  selectable && onSelectCard
                    ? () => onSelectCard(card)
                    : undefined
                }
              />
            );
          })}
        </div>
      );

    case "solitaire":
      return (
        <div className="hand solitaire-hand">
          {hand.cards.map((card, idx) => {
            const selectable = isCardSelectable(card, selectableCards);
            return (
              <Card
                key={idx}
                card={card}
                clickable={selectable}
                onClick={
                  selectable && onSelectCard
                    ? () => onSelectCard(card)
                    : undefined
                }
              />
            );
          })}
        </div>
      );

    case "pyramid":
      return (
        <PyramidHand
          hand={hand}
          selectableCards={selectableCards}
          onSelectCard={onSelectCard}
        />
      );

    default:
      return null;
  }
}

type PyramidHandProps = {
  hand: SerializedPyramidHand;
  selectableCards?: CardType[] | null;
  onSelectCard?: (card: CardType) => void;
};

function PyramidHand({
  hand,
  selectableCards,
  onSelectCard,
}: PyramidHandProps) {
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

          const selectable = isCardSelectable(card, selectableCards);
          return (
            <div key={cardIdx} style={style}>
              <Card
                card={card}
                clickable={selectable}
                onClick={
                  selectable && onSelectCard
                    ? () => onSelectCard(card)
                    : undefined
                }
              />
            </div>
          );
        }),
      )}

      {hand.extraCards.map((card, idx) => {
        const style: React.CSSProperties = {
          gridRow: "3 / span 2",
          gridColumn: `${2 * (idx + 5) + 1} / span 2`,
        };

        const selectable = isCardSelectable(card, selectableCards);
        return (
          <div key={`extra-${idx}`} className="pyramid-extra" style={style}>
            <Card
              card={card}
              clickable={selectable}
              onClick={
                selectable && onSelectCard
                  ? () => onSelectCard(card)
                  : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}
