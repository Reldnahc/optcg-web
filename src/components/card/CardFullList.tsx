import { Link } from "react-router-dom";
import type { Card } from "../../api/types";
import { CardRulesText } from "./CardRulesText";
import { TriggerBlock } from "./TriggerBlock";

function cardLink(card: Card): string {
  const base = `/cards/${card.card_number}`;
  if (card.variant_index != null) return `${base}?variant=${card.variant_index}`;
  return base;
}

export function CardFullList({ cards }: { cards: Card[] }) {
  if (cards.length === 0) {
    return <p className="text-text-muted py-8 text-center">No cards found.</p>;
  }

  return (
    <div className="space-y-5">
      {cards.map((card) => {
        const imageUrl = card.thumbnail_url ?? card.image_url;

        return (
          <div
            key={`${card.card_number}-${card.language}-${card.variant_index ?? "c"}`}
            className="flex gap-4 border-b border-border/50 pb-5"
          >
            <Link to={cardLink(card)} className="shrink-0 w-28 sm:w-36">
              <div className="rounded-xl overflow-hidden bg-bg-tertiary shadow-md">
                {imageUrl ? (
                  <img src={imageUrl} alt={card.name} className="w-full block" loading="lazy" />
                ) : (
                  <div className="aspect-[63/88] bg-bg-tertiary flex items-center justify-center text-text-muted text-[10px]">
                    {card.card_number}
                  </div>
                )}
              </div>
            </Link>
            <div className="min-w-0 flex-1">
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
              {(card.power !== null || card.counter !== null || card.life !== null) && (
                <div className="mt-0.5 text-xs text-text-muted">
                  {card.power !== null && <>{card.power} Power</>}
                  {card.counter !== null && <> &middot; +{card.counter} Counter</>}
                  {card.life !== null && <> &middot; {card.life} Life</>}
                </div>
              )}
              {card.effect && (
                <div className="mt-2 text-[13px] text-text-primary">
                  <CardRulesText text={card.effect} compact />
                </div>
              )}
              {card.trigger && (
                <TriggerBlock className="mt-1 text-[13px]" text={card.trigger} compact />
              )}
              <div className="mt-2 text-[11px] text-text-muted">
                {card.set_name} ({card.set})
                {card.label && <> &middot; {card.label}</>}
                {card.variant_product_name && <> &middot; {card.variant_product_name}</>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
