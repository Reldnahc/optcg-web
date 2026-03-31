import { Link } from "react-router-dom";
import type { Card } from "../../api/types";
import { CardRulesText } from "./CardRulesText";
import { TriggerBlock } from "./TriggerBlock";

function cardLink(card: Card): string {
  const base = `/cards/${card.card_number}`;
  if (card.variant_index != null) return `${base}?variant=${card.variant_index}`;
  return base;
}

export function CardTextList({ cards }: { cards: Card[] }) {
  if (cards.length === 0) {
    return <p className="text-text-muted py-8 text-center">No cards found.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
      {cards.map((card) => (
        <div
          key={`${card.card_number}-${card.language}-${card.variant_index ?? "c"}`}
          className="border-b border-border/50 pb-4"
        >
          <div className="flex items-baseline gap-2">
            <Link to={cardLink(card)} className="text-sm font-bold text-text-primary hover:underline">
              {card.name}
            </Link>
            {card.cost !== null && (
              <span className="text-xs text-text-muted">Cost {card.cost}</span>
            )}
            <span className="ml-auto text-xs font-mono text-text-muted">{card.card_number}</span>
          </div>
          <div className="mt-0.5 text-xs text-text-secondary">
            {card.color.join(" / ")} {card.card_type}
            {card.types.length > 0 && <> — {card.types.join("/")}</>}
            {card.rarity && <> &middot; {card.rarity}</>}
          </div>
          {card.power !== null && (
            <div className="mt-0.5 text-xs text-text-muted">
              {card.power} Power
              {card.counter !== null && <> &middot; +{card.counter} Counter</>}
              {card.life !== null && <> &middot; {card.life} Life</>}
            </div>
          )}
          {card.effect && (
            <div className="mt-1.5 text-[13px] text-text-primary">
              <CardRulesText text={card.effect} compact />
            </div>
          )}
          {card.trigger && (
            <TriggerBlock className="mt-1 text-[13px]" text={card.trigger} compact />
          )}
          {card.label && (
            <div className="mt-1 text-[11px] text-text-muted">{card.label}{card.variant_product_name && <> &middot; {card.variant_product_name}</>}</div>
          )}
        </div>
      ))}
    </div>
  );
}
