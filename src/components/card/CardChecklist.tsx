import { Link } from "react-router-dom";
import type { Card } from "../../api/types";

function cardLink(card: Card): string {
  const base = `/cards/${card.card_number}`;
  if (card.variant_index != null) return `${base}?variant=${card.variant_index}`;
  return base;
}

export function CardChecklist({ cards }: { cards: Card[] }) {
  if (cards.length === 0) {
    return <p className="text-text-muted py-8 text-center">No cards found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted border-b border-border text-[12px] uppercase tracking-wider">
            <th className="pb-2 font-medium">Number</th>
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium hidden sm:table-cell">Set</th>
            <th className="pb-2 font-medium hidden md:table-cell">Type</th>
            <th className="pb-2 font-medium hidden sm:table-cell">Rarity</th>
            <th className="pb-2 font-medium hidden md:table-cell">Color</th>
            {cards.some((c) => c.label) && (
              <th className="pb-2 font-medium">Label</th>
            )}
            {cards.some((c) => c.variant_product_name) && (
              <th className="pb-2 font-medium hidden lg:table-cell">Product</th>
            )}
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr
              key={`${card.card_number}-${card.language}-${card.variant_index ?? "c"}`}
              className="border-b border-border/50 hover:bg-bg-hover/50"
            >
              <td className="py-1.5">
                <Link to={cardLink(card)} className="font-mono text-[13px] hover:underline">
                  {card.card_number}
                </Link>
              </td>
              <td className="py-1.5">
                <Link to={cardLink(card)} className="hover:underline">
                  {card.name}
                </Link>
              </td>
              <td className="py-1.5 text-text-muted hidden sm:table-cell">{card.set}</td>
              <td className="py-1.5 text-text-muted hidden md:table-cell">{card.card_type}</td>
              <td className="py-1.5 text-text-muted hidden sm:table-cell">{card.rarity || "-"}</td>
              <td className="py-1.5 text-text-muted hidden md:table-cell">{card.color.join("/")}</td>
              {cards.some((c) => c.label) && (
                <td className="py-1.5 text-text-muted text-[12px]">{card.label || "-"}</td>
              )}
              {cards.some((c) => c.variant_product_name) && (
                <td className="py-1.5 text-text-muted text-[12px] hidden lg:table-cell">{card.variant_product_name || "-"}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
