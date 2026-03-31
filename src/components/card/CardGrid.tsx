import { Link } from "react-router-dom";
import type { Card } from "../../api/types";

export function CardGrid({ cards }: { cards: Card[] }) {
  if (cards.length === 0) {
    return <p className="text-text-muted py-8 text-center">No cards found.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <CardThumbnail
          key={`${card.card_number}-${card.language}-${card.variant_index ?? "c"}`}
          card={card}
        />
      ))}
    </div>
  );
}

function cardLink(card: Card): string {
  const base = `/cards/${card.card_number}`;
  if (card.variant_index != null) return `${base}?variant=${card.variant_index}`;
  return base;
}

function CardThumbnail({ card }: { card: Card }) {
  const thumbnailUrl = card.thumbnail_url ?? card.image_url;

  return (
    <Link
      to={cardLink(card)}
      className="group block hover:no-underline"
    >
      <div className="relative rounded-xl overflow-hidden bg-bg-tertiary shadow-md group-hover:shadow-lg group-hover:shadow-black/30 transition-all duration-150 group-hover:-translate-y-0.5">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={card.name}
            className="w-full block"
            loading="lazy"
          />
        ) : (
          <div className="aspect-[63/88] bg-bg-tertiary flex flex-col items-center justify-center text-text-muted p-2">
            <span className="text-xs font-mono opacity-60">{card.card_number}</span>
            <span className="text-[11px] mt-1 text-center leading-tight opacity-40">{card.name}</span>
          </div>
        )}
        {card.label && (
          <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
            {card.label}
          </span>
        )}
      </div>
      <div className="mt-1.5 px-0.5">
        <p className="text-[13px] font-medium text-text-primary truncate group-hover:text-link">{card.name}</p>
        <p className="text-[11px] text-text-muted truncate">
          {card.card_number}
          {card.rarity && <> &middot; {card.rarity}</>}
          {card.color.length > 0 && <> &middot; {card.color.join("/")}</>}
          {card.card_type && <> &middot; {card.card_type}</>}
        </p>
        {card.variant_product_name && (
          <p className="text-[10px] text-text-muted truncate">{card.variant_product_name}</p>
        )}
      </div>
    </Link>
  );
}
