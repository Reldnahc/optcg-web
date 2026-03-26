import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { CardDetail as CardDetailType, CardImage } from "../../api/types";

const STATUS_BADGE_STYLE: Record<string, string> = {
  legal: "border-legal/30 bg-legal/10 text-legal",
  banned: "border-banned/30 bg-banned/10 text-banned",
  restricted: "border-restricted/30 bg-restricted/10 text-restricted",
  pair: "border-pair/30 bg-pair/10 text-pair",
  not_legal: "border-not-legal/30 bg-not-legal/10 text-text-secondary",
  unreleased: "border-accent/30 bg-accent/10 text-accent",
};

export function CardDetailView({ card, initialVariant }: { card: CardDetailType; initialVariant?: number }) {
  const [, setSearchParams] = useSearchParams();
  const images = card.images; // API already returns images in display order (label priority)
  // Find the index in the images array that matches the requested variant_index
  const initialIdx = initialVariant != null
    ? Math.max(0, images.findIndex((img) => img.variant_index === initialVariant))
    : 0; // First image is already the best default (API sorts by label priority)
  const [selectedVariant, setSelectedVariant] = useState(initialIdx);
  const currentImage = images[selectedVariant] || images[0];
  const currentVariantMarket = currentImage ? getVariantMarketInfo(currentImage) : { marketPrice: null, tcgplayerUrl: null };
  const legalityEntries = Object.entries(card.legality);
  const featuredLegalityEntries = legalityEntries.filter(([format]) => isFeaturedFormat(format));
  const otherLegalityEntries = legalityEntries.filter(([format]) => !isFeaturedFormat(format));

  useEffect(() => {
    setSelectedVariant(initialIdx);
  }, [card.card_number, initialIdx]);

  const selectVariant = (i: number) => {
    setSelectedVariant(i);
    const img = images[i];
    if (img) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("variant", String(img.variant_index));
        return next;
      }, { replace: true });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pt-4 pb-6">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Card Image */}
        <div className="lg:w-[320px] xl:w-[360px] shrink-0">
          <CardImageViewer
            images={images}
            selected={selectedVariant}
            onSelect={selectVariant}
            cardName={card.name}
          />
        </div>

        {/* Middle: Game info */}
        <div className="min-w-0 flex-[1.15]">
          {/* Name + type line */}
          <div className="border-b border-border pb-3 mb-4">
            <h1 className="text-xl font-bold">{card.name}</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {card.color.join(" / ")} &middot; {card.card_type}
              {card.cost !== null && <> &middot; Cost {card.cost}</>}
            </p>
          </div>

          {/* Game stats */}
          <div className="space-y-1.5 text-sm mb-4">
            {card.power !== null && <Row label="Power" value={String(card.power)} />}
            {card.counter !== null && <Row label="Counter" value={`+${card.counter}`} />}
            {card.life !== null && <Row label="Life" value={String(card.life)} />}
            {card.attribute && card.attribute.length > 0 && <Row label="Attribute" value={card.attribute.join(" / ")} />}
            <Row label="Type" value={card.types.join(", ")} />
          </div>

          {/* Effect */}
          {card.effect && (
            <div className="mb-4 border border-border rounded bg-bg-card p-4">
              <p className="effect-text whitespace-pre-line">{card.effect}</p>
            </div>
          )}

          {/* Trigger */}
          {card.trigger && (
            <div className="mb-4 border border-border rounded bg-bg-card p-4">
              <p className="text-xs text-text-muted uppercase font-semibold tracking-wider mb-1">Trigger</p>
              <p className="effect-text whitespace-pre-line">{card.trigger}</p>
            </div>
          )}

          {/* Legality */}
          <Section title="Legality">
            <div className="space-y-2">
              {featuredLegalityEntries.length > 0 && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {featuredLegalityEntries.map(([format, info]) => (
                    <LegalityItem key={format} format={format} info={info} />
                  ))}
                </div>
              )}
              {otherLegalityEntries.map(([format, info]) => (
                <LegalityItem key={format} format={format} info={info} />
              ))}
            </div>
          </Section>

          {/* Prices */}
          {currentImage && Object.keys(currentImage.prices).length > 0 && (
            <Section title="Prices">
              <div className="space-y-2">
                {Object.entries(currentImage.prices).map(([subType, price]) => (
                  <div
                    key={subType}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(4.5rem,auto)_auto] items-center gap-2.5 rounded-md border border-border bg-bg-card/45 px-3 py-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(4.75rem,auto)_minmax(4.75rem,auto)_auto] sm:gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-text-primary sm:text-sm">TCGplayer</p>
                    </div>
                    <div className="hidden sm:block">
                      <PriceStat label="Low" value={fmtPrice(price.low_price)} muted />
                    </div>
                    <PriceStat label="Market" value={fmtPrice(price.market_price)} />
                    <TcgplayerButton href={price.tcgplayer_url ?? currentImage.tcgplayer_url ?? null} label="Buy" />
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right: Print info */}
        <div className="lg:w-[320px] xl:w-[360px] shrink-0 space-y-4">
          <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3 text-sm">
            {currentImage?.label && (
              <PrintRow label="Variant">
                {currentImage.label}
              </PrintRow>
            )}
            <PrintRow label="Set">
              <Link to={`/sets/${card.set}`} className="hover:underline">
                {card.set_name}
                <span className="text-text-muted ml-1">({card.set})</span>
              </Link>
            </PrintRow>
            {currentImage?.product_name && (
              <PrintRow label="Product">
                <Link
                  to={`/search?q=${encodeURIComponent(`product="${currentImage.product_name}"`)}`}
                  className="hover:underline"
                >
                  {currentImage.product_name}
                </Link>
              </PrintRow>
            )}
            <div className={`grid gap-2 ${card.block ? "grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)]" : "grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"}`}>
              <InlineMeta label="Number">
                <span className="font-mono">{card.card_number}</span>
              </InlineMeta>
              <InlineMeta label="Rarity">
                {card.rarity || "N/A"}
              </InlineMeta>
              {card.block && (
                <InlineMeta label="Block">
              {card.block}
                </InlineMeta>
              )}
            </div>
            {card.artist && (
              <PrintRow label="Artist">
                <Link
                  to={`/search?q=${encodeURIComponent(`artist:"${card.artist}"`)}`}
                  className="hover:underline"
                >
                  {card.artist}
                </Link>
              </PrintRow>
            )}
          </div>
          <div className="bg-bg-card border border-border rounded-lg p-2.5 space-y-1.5 text-sm">
            <p className="text-xs text-text-muted uppercase tracking-wider">
              {images.length > 1 ? "Variants" : "Variant"}
            </p>
            <div className="space-y-1">
              {images.map((img, i) => {
                const market = getVariantMarketInfo(img);
                const marketLabel = fmtPrice(market.marketPrice);
                const isSelected = i === selectedVariant;

                return (
                  <div
                    key={img.variant_index}
                    className={`flex items-center gap-1 rounded-md border px-1 py-0.5 transition-colors ${
                      isSelected
                        ? "border-accent bg-accent/10"
                        : "border-border bg-bg-tertiary/20"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectVariant(i)}
                      disabled={images.length <= 1}
                      className={`min-w-0 flex-1 rounded px-1.5 py-0.75 text-left transition-colors ${
                        images.length > 1 ? "hover:bg-black/5" : ""
                      }`}
                    >
                      <p className="truncate text-sm font-medium text-text-primary">
                        {img.product_name || card.set_name}
                      </p>
                      <div className="mt-px flex items-center gap-1 text-xs text-text-muted">
                        <span className="shrink-0 font-medium text-text-primary">{marketLabel}</span>
                        <span className="text-text-muted/60">&middot;</span>
                        <span className="truncate">{img.label || `Variant ${img.variant_index}`}</span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-1 pt-0.5">
              <TcgplayerButton href={currentVariantMarket.tcgplayerUrl} label="Buy on TCGPlayer" />
              <ExternalButton href={buildEbaySearchUrl(card.card_number, currentImage?.label)} label="Buy on eBay" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtPrice(val: string | null): string {
  if (!val) return "-";
  return `$${parseFloat(val).toFixed(2)}`;
}

function getVariantMarketInfo(image: CardImage): { marketPrice: string | null; tcgplayerUrl: string | null } {
  for (const price of Object.values(image.prices)) {
    if (price.market_price || price.tcgplayer_url) {
      return {
        marketPrice: price.market_price,
        tcgplayerUrl: price.tcgplayer_url ?? image.tcgplayer_url ?? null,
      };
    }
  }

  return {
    marketPrice: null,
    tcgplayerUrl: image.tcgplayer_url ?? null,
  };
}

function getLegalityDisplay(info: CardDetailType["legality"][string]): { label: string; note: string | null; tone: string } {
  if (info.status === "legal") {
    return { label: "Legal", note: null, tone: "legal" };
  }

  if (info.status === "banned" || info.status === "restricted" || info.status === "pair") {
    const isFuture = info.banned_at ? new Date(info.banned_at) > new Date() : false;
    const dateStr = info.banned_at
      ? new Date(info.banned_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
      : null;

    if (info.status === "banned") {
      return {
        label: isFuture ? "Upcoming Ban" : "Banned",
        note: dateStr ? (isFuture ? `Effective ${dateStr}` : `Banned ${dateStr}`) : null,
        tone: isFuture ? "unreleased" : "banned",
      };
    }

    if (info.status === "restricted") {
      const copies = info.max_copies != null ? `${info.max_copies} copy` : "limited copies";
      return {
        label: isFuture ? "Upcoming Restriction" : "Restricted",
        note: isFuture ? `Max ${copies} per deck, effective ${dateStr}` : `Max ${copies} per deck`,
        tone: isFuture ? "unreleased" : "restricted",
      };
    }

    // pair
    const raw = info.paired_with ?? [];
    const partners = Array.isArray(raw) ? raw : [raw];
    return {
      label: isFuture ? "Upcoming Pair Ban" : "Pair Banned",
      note: partners.length > 0 ? `Cannot be used with ${partners.join(", ")}` : null,
      tone: isFuture ? "unreleased" : "pair",
    };
  }

  if (info.status === "not_legal") {
    return { label: "Not Legal", note: null, tone: "not_legal" };
  }

  if (info.status.startsWith("Releases")) {
    return { label: "Upcoming", note: info.status, tone: "unreleased" };
  }

  return { label: info.status, note: null, tone: "not_legal" };
}

function isFeaturedFormat(format: string): boolean {
  return format === "Standard" || format === "Extra Regulation";
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline">
      <span className="text-text-muted w-20 shrink-0">{label}</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}

function PrintRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-text-muted uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-text-primary">{children}</p>
    </div>
  );
}

function InlineMeta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col items-center text-center rounded-md border border-border bg-bg-tertiary/25 px-2.5 py-1.5 whitespace-nowrap">
      <span className="text-xs uppercase tracking-wider text-text-muted">{label}</span>
      <span className="mt-0.5 text-sm font-medium text-text-primary">{children}</span>
    </div>
  );
}

function LegalityItem({ format, info }: { format: string; info: CardDetailType["legality"][string] }) {
  const legality = getLegalityDisplay(info);
  const partners = info.status === "pair" && info.paired_with
    ? (Array.isArray(info.paired_with) ? info.paired_with : [info.paired_with])
    : [];

  return (
    <div className="rounded-md border border-border bg-bg-card/45 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <Link to={`/formats/${encodeURIComponent(format)}`} className="text-sm leading-tight font-medium text-text-primary hover:text-link">
          {format}
        </Link>
        <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs leading-tight font-medium ${STATUS_BADGE_STYLE[legality.tone] || "border-border text-text-muted"}`}>
          {legality.label}
        </span>
      </div>
      {partners.length > 0 ? (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1 text-xs text-text-muted">
          <span className="whitespace-nowrap">Cannot be used with</span>
          {partners.map((card, i) => (
            <span key={card} className="whitespace-nowrap">
              {i > 0 && ", "}
              <Link to={`/cards/${card}`} className="font-mono text-link hover:text-link-hover">{card}</Link>
            </span>
          ))}
        </p>
      ) : legality.note ? (
        <p className="mt-1 text-xs text-text-muted">
          {legality.note}
        </p>
      ) : null}
    </div>
  );
}

function PriceStat({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[11px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`mt-0.5 whitespace-nowrap tabular-nums text-sm font-medium ${muted ? "text-text-secondary" : "text-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}

function TcgplayerButton({ href, label }: { href: string | null; label: string }) {
  const className = "inline-flex min-h-8 min-w-[3.5rem] shrink-0 items-center justify-center rounded-md border border-border bg-bg-card px-1.5 py-1.5 text-[10px] font-semibold transition-colors sm:min-h-9 sm:min-w-[6.5rem] sm:px-3 sm:py-2 sm:text-xs";

  if (!href) {
    return (
      <span className={`${className} text-text-muted`}>
        {label}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open listing on TCGplayer"
      title="Open listing on TCGplayer"
      className={`${className} text-text-primary hover:border-text-muted/40 hover:bg-bg-tertiary/35`}
    >
      {label}
    </a>
  );
}

function ExternalButton({ href, label }: { href: string | null; label: string }) {
  const className = "inline-flex min-h-9 min-w-[6.5rem] items-center justify-center rounded-md border border-border bg-bg-card px-3 py-2 text-xs font-semibold transition-colors";

  if (!href) {
    return (
      <span className={`${className} text-text-muted`}>
        {label}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} text-text-primary hover:border-text-muted/40 hover:bg-bg-tertiary/35`}
    >
      {label}
    </a>
  );
}

function buildEbaySearchUrl(cardNumber: string, variantLabel: string | null | undefined): string {
  const query = [cardNumber, variantLabel].filter(Boolean).join(" ");
  return `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(query)}`;
}


function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 pt-4 border-t border-border">
      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2.5">{title}</h3>
      {children}
    </div>
  );
}

function CardImageViewer({
  images,
  selected,
  onSelect,
  cardName,
}: {
  images: CardImage[];
  selected: number;
  onSelect: (i: number) => void;
  cardName: string;
}) {
  const current = images[selected];
  const hasScan = !!current?.scan_url;
  const [showScan, setShowScan] = useState(false);
  const displayUrl = showScan && hasScan ? current.scan_url : current?.image_url;

  return (
    <div>
      <div className="rounded-xl overflow-hidden bg-bg-card shadow-lg shadow-black/40">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt={cardName}
            className="w-full block"
            loading="eager"
          />
        ) : (
          <div className="aspect-[63/88] flex items-center justify-center text-text-muted text-sm">
            No image available
          </div>
        )}
      </div>

      {/* Digital / Scan toggle */}
      {hasScan && (
        <div className="flex gap-0.5 mt-2 bg-bg-card rounded-md p-0.5 border border-border">
          <button
            onClick={() => setShowScan(false)}
            className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors
              ${!showScan ? "bg-accent text-bg-primary" : "text-text-muted hover:text-text-primary"}`}
          >
            Digital
          </button>
          <button
            onClick={() => setShowScan(true)}
            className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors
              ${showScan ? "bg-accent text-bg-primary" : "text-text-muted hover:text-text-primary"}`}
          >
            Scan
          </button>
        </div>
      )}

      {/* Variant strip */}
      {images.length > 1 && (
        <div className={`grid gap-1.5 mt-3 ${images.length > 3 ? "grid-cols-3" : `grid-cols-${images.length}`}`}>
          {images.map((img, i) => {
            const thumbnailUrl = img.thumbnail_url ?? img.image_url;

            return (
              <button
                key={i}
                onClick={() => onSelect(i)}
                className={`rounded-md overflow-hidden border-2 transition-colors
                  ${i === selected ? "border-accent" : "border-transparent hover:border-text-muted/40"}`}
                title={img.label || `Variant ${i}`}
              >
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt={img.label || `Variant ${i}`} className="w-full block" loading="lazy" />
                ) : (
                  <div className="aspect-[63/88] bg-bg-tertiary text-text-muted text-[9px] flex items-center justify-center">
                    {img.label || `v${i}`}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
