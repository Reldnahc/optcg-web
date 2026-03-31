import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useCard } from "../api/hooks";
import { CardDetailView } from "../components/card/CardDetail";
import { ErrorState } from "../components/layout/ErrorState";
import { usePageMeta } from "../hooks/usePageMeta";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "EN",
  ja: "JA",
  fr: "FR",
  zh: "ZH",
};

export function CardPage() {
  const { card_number } = useParams<{ card_number: string }>();
  const [params, setParams] = useSearchParams();
  const lang = params.get("lang") || "en";
  const variantParam = params.get("variant");
  const { data, isLoading, error } = useCard(card_number!, lang);

  const switchLang = (code: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (code === "en") next.delete("lang"); else next.set("lang", code);
      return next;
    }, { replace: true });
  };

  const card = data?.data;
  const available = card?.available_languages ?? [];
  const showSwitcher = available.length > 1;

  const metaTitle = card ? `${card.name} (${card.card_number})` : undefined;
  const metaDesc = card
    ? [
        card.card_number,
        card.color.join("/"),
        card.card_type,
        card.types.length > 0 ? card.types.join("/") : null,
        card.cost !== null ? `Cost ${card.cost}` : null,
        card.power !== null ? `${card.power} Power` : null,
      ].filter(Boolean).join(" · ")
    : undefined;
  const cardImage = card?.image_url || card?.thumbnail_url || undefined;
  const firstVariant = card?.variants?.[0];
  const marketPrice = firstVariant?.market?.prices
    ? Object.values(firstVariant.market.prices).find((p) => p.market_price)?.market_price
    : null;

  const jsonLd = useMemo(() => {
    if (!card) return undefined;
    const ld: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: card.name,
      description: metaDesc ? `${card.name} — ${metaDesc}` : card.name,
      category: "Trading Card",
      brand: { "@type": "Brand", name: "One Piece Card Game" },
    };
    if (cardImage) ld.image = cardImage;
    if (marketPrice) {
      ld.offers = {
        "@type": "Offer",
        price: marketPrice,
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      };
    }
    return ld;
  }, [card, cardImage, marketPrice, metaDesc]);

  usePageMeta({
    title: metaTitle,
    description: metaDesc ? `${card!.name} — ${metaDesc}. One Piece TCG card details, prices, and legality.` : undefined,
    image: cardImage,
    url: card ? `/cards/${card.card_number}` : undefined,
    twitterCard: cardImage ? "summary_large_image" : "summary",
    jsonLd,
  });

  if (error) return <ErrorState message={(error as Error).message} wide />;

  return (
    <div>
      {showSwitcher && (
        <div className="max-w-6xl mx-auto px-4 pt-2.5 flex justify-end sm:hidden">
          <div className="flex gap-px bg-bg-card rounded-md p-px border border-border">
            {available.map((code) => (
              <button
                key={code}
                onClick={() => switchLang(code)}
                className={`min-w-9 px-2 py-0.75 text-[11px] font-medium rounded transition-colors
                  ${lang === code
                    ? "bg-accent text-bg-primary"
                    : "text-text-muted hover:text-text-primary"}`}
              >
                {LANGUAGE_LABELS[code] || code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
      {isLoading && <div className="p-8" aria-live="polite"><span className="sr-only">Loading card</span></div>}
      {data && (
        <CardDetailView
          card={data.data}
          initialVariant={variantParam != null ? parseInt(variantParam, 10) : undefined}
          languageSwitcher={showSwitcher ? {
            current: lang,
            available,
            labels: LANGUAGE_LABELS,
            onSelect: switchLang,
          } : undefined}
        />
      )}
    </div>
  );
}
