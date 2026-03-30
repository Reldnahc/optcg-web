import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { buildApiUrl } from "../../api/client";
import type { CardDetail as CardDetailType, CardVariant } from "../../api/types";
import { CopyButton } from "../CopyButton";
import { CardHoverPreviewLink } from "./CardHoverPreviewLink";
import { CardRulesText } from "./CardRulesText";

type LanguageSwitcherConfig = {
  current: string;
  available: string[];
  labels: Record<string, string>;
  onSelect: (code: string) => void;
};

type ToolAction = {
  key: string;
  label: string;
  kind: "image" | "scan" | "json" | "report";
  href?: string;
  downloadName?: string;
  mock?: boolean;
};

const STATUS_BADGE_STYLE: Record<string, string> = {
  legal: "border-legal/30 bg-legal/10 text-legal",
  banned: "border-banned/30 bg-banned/10 text-banned",
  restricted: "border-restricted/30 bg-restricted/10 text-restricted",
  pair: "border-pair/30 bg-pair/10 text-pair",
  not_legal: "border-not-legal/30 bg-not-legal/10 text-text-secondary",
  unreleased: "border-accent/30 bg-accent/10 text-accent",
};
const TCGPLAYER_AFFILIATE_BASE_URL = "https://partner.tcgplayer.com/poneglyph";
const IMAGE_AUTO_PREFERENCE_STORAGE_KEY = "optcg.imageDisplayAutoPreference";

export function CardDetailView({
  card,
  initialVariant,
  languageSwitcher,
}: {
  card: CardDetailType;
  initialVariant?: number;
  languageSwitcher?: LanguageSwitcherConfig;
}) {
  const [, setSearchParams] = useSearchParams();
  const variants = card.variants;
  // API already returns variants in display order.
  const initialIdx = initialVariant != null
    ? Math.max(0, variants.findIndex((variant) => variant.variant_index === initialVariant))
    : 0;
  const [selectedVariant, setSelectedVariant] = useState(initialIdx);
  const currentVariant = variants[selectedVariant] || variants[0];
  const cardApiJsonUrl = buildApiUrl(`/cards/${card.card_number}`, { lang: card.language });
  const toolActions: ToolAction[] = [];
  if (currentVariant?.media.image_url) {
    toolActions.push({
      key: "image",
      kind: "image",
      href: currentVariant.media.image_url,
      downloadName: buildVariantDownloadName(card.card_number, currentVariant.label, "image"),
      label: "Download image",
    });
  }
  if (currentVariant?.media.scan_url) {
    toolActions.push({
      key: "scan",
      kind: "scan",
      href: currentVariant.media.scan_url,
      downloadName: buildVariantDownloadName(card.card_number, currentVariant.label, "scan"),
      label: "Download scan",
    });
  }
  toolActions.push({ key: "json", kind: "json", href: cardApiJsonUrl, label: "JSON" });
  toolActions.push({ key: "report", kind: "report", label: "Report issue", mock: true });
  const legalityEntries = Object.entries(card.legality);
  const featuredLegalityEntries = legalityEntries.filter(([format]) => isFeaturedFormat(format));
  const otherLegalityEntries = legalityEntries.filter(([format]) => !isFeaturedFormat(format));

  useEffect(() => {
    setSelectedVariant(initialIdx);
  }, [card.card_number, initialIdx]);

  const selectVariant = (i: number) => {
    setSelectedVariant(i);
    const variant = variants[i];
    if (variant) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("variant", String(variant.variant_index));
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
            variants={variants}
            selected={selectedVariant}
            onSelect={selectVariant}
            cardName={card.name}
          />
        </div>

        {/* Middle: Game info */}
        <div className="min-w-0 flex-[1.15]">
          {/* Name + type line */}
          <div className="border-b border-border pb-3 mb-4">
            <div className="flex items-baseline gap-3">
              <h1 className="min-w-0 text-xl font-bold">{card.name}</h1>
              <div className="ml-auto inline-flex shrink-0 items-center gap-1.5">
                <CopyButton
                  value={card.card_number}
                  label="Copy card number"
                  copiedLabel="Card number copied"
                />
                <span className="font-mono text-sm text-text-secondary">{card.card_number}</span>
              </div>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm leading-none text-text-secondary">
              {card.rarity && card.rarity !== "L" && (
                <>
                  <span>{card.rarity}</span>
                  <DotSeparator size="sm" />
                </>
              )}
              <span>{card.color.join(" / ")}</span>
              <DotSeparator size="sm" />
              <span>{card.card_type}</span>
              {card.cost !== null && (
                <>
                  <DotSeparator size="sm" />
                  <span>Cost {card.cost}</span>
                </>
              )}
              {card.life !== null && (
                <>
                  <DotSeparator size="sm" />
                  <span>{card.life} life</span>
                </>
              )}
            </div>
          </div>

          {/* Game stats */}
          <div className="space-y-1.5 text-sm mb-4">
            {(card.power !== null || card.counter !== null || (card.attribute && card.attribute.length > 0)) && (
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                {card.power !== null && <StatLine value={String(card.power)} suffix="Power" />}
                {card.power !== null && card.attribute && card.attribute.length > 0 && (
                  <DotSeparator />
                )}
                {card.attribute && card.attribute.length > 0 && <MetaLine value={card.attribute.join(" / ")} />}
                {card.counter !== null && (card.power !== null || (card.attribute && card.attribute.length > 0)) && (
                  <DotSeparator />
                )}
                {card.counter !== null && <StatLine value={`+${card.counter}`} suffix="Counter" />}
              </div>
            )}
          </div>

          {/* Effect / Trigger */}
          {(card.effect || card.trigger) && (
            <div className="mb-4 border border-border rounded bg-bg-card p-4">
              {card.effect ? (
                <CardRulesText text={card.effect} />
              ) : null}
              {card.trigger ? (
                <div className={card.effect ? "mt-3" : ""}>
                  <CardRulesText text={card.trigger} />
                </div>
              ) : null}
            </div>
          )}

          <Section title="Type" inlineTitle>
            <MetaLine value={card.types.join("/")} />
          </Section>

          {/* Legality */}
          <Section
            title="Legality"
            headerRight={card.block ? (
              <span className="text-xs uppercase tracking-wider text-text-muted">
                Block <span className="text-text-primary">{card.block}</span>
              </span>
            ) : null}
          >
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

          {currentVariant && Object.keys(currentVariant.market.prices).length > 0 && (
            <Section title="Prices">
              <div className="space-y-2">
                {Object.entries(currentVariant.market.prices).map(([subType, price]) => (
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
                    <TcgplayerButton href={price.tcgplayer_url ?? currentVariant.market.tcgplayer_url ?? null} label="Buy" />
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section title="Tools">
            <InfoPanel title="Actions" compact>
              <div className="space-y-1.5">
                {toolActions.map((action) => (
                  <ToolActionRow key={action.key} action={action} />
                ))}
              </div>
            </InfoPanel>
          </Section>
        </div>

        {/* Right: Print info */}
        <div className="lg:w-[320px] xl:w-[360px] shrink-0 space-y-4">
          {languageSwitcher && (
            <div className="hidden sm:flex sm:justify-end">
              <div className="flex gap-px rounded-md border border-border bg-bg-tertiary/30 p-px">
                {languageSwitcher.available.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => languageSwitcher.onSelect(code)}
                    className={`min-w-8 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                      languageSwitcher.current === code
                        ? "bg-accent text-bg-primary"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {languageSwitcher.labels[code] || code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="bg-bg-card border border-border rounded-lg p-4 space-y-3 text-sm">
            <PrintRow label="Set">
              <Link to={`/sets/${card.set}`} className="hover:underline">
                {card.set_name}
                <span className="text-text-muted ml-1">({card.set})</span>
              </Link>
            </PrintRow>
            {currentVariant?.product.name && (
              <PrintRow label="Product">
                <Link
                  to={`/search?q=${encodeURIComponent(`product="${currentVariant.product.name}"`)}`}
                  className="hover:underline"
                >
                  {currentVariant.product.name}
                  {currentVariant.product.set_code ? (
                    <span className="text-text-muted ml-1">({currentVariant.product.set_code})</span>
                  ) : null}
                </Link>
              </PrintRow>
            )}
          </div>
          <div className="bg-bg-card border border-border rounded-lg p-2.5 space-y-1.5 text-sm">
            <p className="text-xs text-text-muted uppercase tracking-wider">
              {variants.length > 1 ? "Variants" : "Variant"}
            </p>
            <div className="space-y-1">
              {variants.map((variant, i) => {
                const market = getVariantMarketInfo(variant);
                const marketLabel = fmtPrice(market.marketPrice);
                const isSelected = i === selectedVariant;

                return (
                  <div
                    key={variant.variant_index}
                    className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border px-1 py-0.5 transition-colors ${
                      isSelected
                        ? "border-accent bg-accent/10"
                        : "border-border bg-bg-tertiary/20"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectVariant(i)}
                      disabled={variants.length <= 1}
                      className={`min-w-0 flex-1 rounded px-1.5 py-0.75 text-left transition-colors ${
                        variants.length > 1 ? "hover:bg-black/5" : ""
                      }`}
                    >
                      <p className="truncate text-sm font-medium text-text-primary">
                        {variant.product.name || card.set_name}
                        {variant.product.set_code ? (
                          <span className="text-text-muted ml-1">({variant.product.set_code})</span>
                        ) : null}
                      </p>
                      <div className="mt-px flex items-center gap-1 text-xs text-text-muted">
                        <span className="shrink-0 font-medium text-text-primary">{marketLabel}</span>
                        <span className="text-text-muted/60">&middot;</span>
                        <span className="truncate">{variant.label || `Variant ${variant.variant_index}`}</span>
                        {variant.artist ? (
                          <>
                            <span className="text-text-muted/60">&middot;</span>
                            <Link
                              to={`/search?q=${encodeURIComponent(`artist:"${variant.artist}"`)}`}
                              className="truncate transition-colors hover:text-text-primary"
                            >
                              {variant.artist}
                            </Link>
                          </>
                        ) : null}
                      </div>
                    </button>
                    <span />
                  </div>
                );
              })}
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

function getVariantMarketInfo(variant: CardVariant): { marketPrice: string | null; tcgplayerUrl: string | null } {
  for (const price of Object.values(variant.market.prices)) {
    if (price.market_price || price.tcgplayer_url) {
      return {
        marketPrice: price.market_price,
        tcgplayerUrl: price.tcgplayer_url ?? variant.market.tcgplayer_url ?? null,
      };
    }
  }

  return {
    marketPrice: null,
    tcgplayerUrl: variant.market.tcgplayer_url ?? null,
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

function StatLine({ value, suffix }: { value: React.ReactNode; suffix: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-text-primary font-medium">{value}</span>
      <span className="text-text-secondary">{suffix}</span>
    </div>
  );
}

function MetaLine({ value }: { value: React.ReactNode }) {
  return <div className="text-text-primary">{value}</div>;
}

function DotSeparator({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span
      className={`${size === "sm" ? "h-1 w-1 translate-y-px" : "h-1.25 w-1.25"} shrink-0 self-center rounded-full bg-text-muted/60`}
      aria-hidden="true"
    />
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

function LegalityItem({ format, info }: { format: string; info: CardDetailType["legality"][string] }) {
  const legality = getLegalityDisplay(info);
  const partners = info.status === "pair" && info.paired_with
    ? (Array.isArray(info.paired_with) ? info.paired_with : [info.paired_with])
    : [];

  return (
    <div className="rounded-md border border-border bg-bg-card/45 px-3 py-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Link
          to={`/formats/${encodeURIComponent(format)}`}
          className="min-w-0 truncate whitespace-nowrap text-sm leading-tight font-medium text-text-primary hover:text-link"
        >
          {format}
        </Link>
        <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs leading-tight font-medium ${STATUS_BADGE_STYLE[legality.tone] || "border-border text-text-muted"}`}>
          {legality.label}
        </span>
      </div>
      {partners.length > 0 ? (
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1 text-xs text-text-muted">
          <span className="whitespace-nowrap">Cannot be used with</span>
              {partners.map((card, i) => (
                <span key={card} className="whitespace-nowrap">
                  {i > 0 && ", "}
                  <CardHoverPreviewLink cardNumber={card} className="font-mono text-link hover:text-link-hover">
                    {card}
                  </CardHoverPreviewLink>
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

function TcgplayerButton({ href, label }: { href: string | null; label: string }) {
  const className = "inline-flex min-h-9 min-w-[9.5rem] shrink-0 items-center justify-center rounded-md border border-border bg-bg px-3 py-2 text-xs font-semibold transition-colors";
  const affiliateHref = buildTcgplayerAffiliateUrl(href);

  if (!affiliateHref) {
    return (
      <span className={`${className} text-text-muted`}>
        {label}
      </span>
    );
  }

  return (
    <a
      href={affiliateHref}
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

function buildTcgplayerAffiliateUrl(href: string | null): string | null {
  if (!href) return null;

  try {
    const targetUrl = new URL(href);
    if (targetUrl.hostname === "partner.tcgplayer.com") {
      return href;
    }

    const affiliateUrl = new URL(TCGPLAYER_AFFILIATE_BASE_URL);
    affiliateUrl.searchParams.set("u", targetUrl.toString());
    return affiliateUrl.toString();
  } catch {
    return href;
  }
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

function buildVariantDownloadName(
  cardNumber: string,
  variantLabel: string | null | undefined,
  kind: "image" | "scan",
): string {
  const suffix = variantLabel
    ? variantLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    : "default";
  return `${cardNumber.toLowerCase()}-${suffix}-${kind}.jpg`;
}

function InfoPanel({
  title,
  children,
  compact = false,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={`rounded-lg border border-border bg-bg-card/35 ${compact ? "px-2.5 py-2" : "px-3 py-2.5"}`}>
      <h3 className={`text-[11px] font-bold uppercase tracking-wider text-text-muted ${compact ? "mb-1" : "mb-1.5"}`}>{title}</h3>
      {children}
    </section>
  );
}

function ToolActionRow({ action }: { action: ToolAction }) {
  const isReport = action.kind === "report";
  const content = (
    <>
      <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center ${isReport ? "text-banned" : "text-text-secondary"}`}>
        <ToolIcon kind={action.kind} />
      </span>
      <span className="min-w-0 flex-1 truncate">{action.label}</span>
    </>
  );

  const className = `flex w-full items-center gap-1.5 py-px text-[13px] leading-tight no-underline transition-colors hover:underline ${isReport ? "text-banned visited:text-banned hover:text-banned" : "text-text-secondary hover:text-text-primary"}`;

  if (action.mock || !action.href) {
    return (
      <a
        href="#"
        onClick={(event) => event.preventDefault()}
        className={className}
        title={action.mock ? "Coming soon" : undefined}
        style={isReport ? { color: "var(--color-banned)" } : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <a
      href={action.href}
      target="_blank"
      rel="noopener noreferrer"
      download={action.downloadName}
      className={className}
    >
      {content}
    </a>
  );
}

function ToolIcon({ kind }: { kind: ToolAction["kind"] }) {
  if (kind === "json") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.5" aria-hidden="true">
        <path d="M5 2.5H9.5L12.5 5.5V13a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
        <path d="M9.5 2.5V5.5H12.5" />
        <path d="M6.25 9.25h3.5M6.25 11h2.5" />
      </svg>
    );
  }

  if (kind === "report") {
    return (
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.5" aria-hidden="true">
        <path d="M4 2.5v11" />
        <path d="M4 3h6l-1.5 2.5L10 8H4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 2.5v6.25" />
      <path d="m5.5 6.5 2.5 2.5 2.5-2.5" />
      <path d="M3 11.5v1A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-1" />
    </svg>
  );
}


function Section({
  title,
  children,
  inlineTitle = false,
  headerRight = null,
}: {
  title: string;
  children: React.ReactNode;
  inlineTitle?: boolean;
  headerRight?: React.ReactNode;
}) {
  return (
    <div className="mt-5 pt-4 border-t border-border">
      {inlineTitle ? (
        <div className="flex items-baseline gap-2">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">{title}</h3>
          <div className="min-w-0 text-sm text-text-primary">{children}</div>
        </div>
      ) : (
        <>
          <div className="mb-2.5 flex items-baseline gap-2">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">{title}</h3>
            {headerRight}
          </div>
          {children}
        </>
      )}
    </div>
  );
}

function getVariantStripContainerClass(count: number): string {
  if (count >= 4) return "mt-3 flex gap-1.5 overflow-x-auto pb-1";
  if (count >= 2) return "mt-3 grid gap-1.5 grid-cols-3";
  return "mt-3 grid gap-1.5 grid-cols-1";
}

function getVariantStripItemClass(count: number, scrollable: boolean): string {
  const cursorClass = scrollable ? "cursor-grab active:cursor-grabbing" : "";
  if (count >= 4) return `w-[calc((100%-0.75rem)/3)] min-w-[calc((100%-0.75rem)/3)] shrink-0 text-left ${cursorClass}`.trim();
  return `min-w-0 text-left ${cursorClass}`.trim();
}

function abbreviateVariantStripLabel(label: string): string {
  const words = label.match(/[A-Za-z0-9]+/g) ?? [];
  if (words.length <= 1) return label;
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

type ImagePreference = "digital" | "scan";

function CardImageViewer({
  variants,
  selected,
  onSelect,
  cardName,
}: {
  variants: CardVariant[];
  selected: number;
  onSelect: (i: number) => void;
  cardName: string;
}) {
  const current = variants[selected];
  const hasAnyScans = variants.some((variant) => !!variant.media.scan_url);
  const [imagePreference, setImagePreference] = useState<ImagePreference>(getStoredImagePreference);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ dragging: boolean; startX: number; startScrollLeft: number; moved: boolean }>({
    dragging: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });
  const suppressClickRef = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(IMAGE_AUTO_PREFERENCE_STORAGE_KEY, imagePreference);
  }, [imagePreference]);

  const displayUrl = resolveImageDisplayUrl(current, imagePreference);
  const isScrollableVariantStrip = variants.length >= 4;

  const handleVariantStripMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isScrollableVariantStrip || event.button !== 0) return;
    const strip = stripRef.current;
    if (!strip) return;
    suppressClickRef.current = false;

    dragStateRef.current = {
      dragging: true,
      startX: event.clientX,
      startScrollLeft: strip.scrollLeft,
      moved: false,
    };
    event.preventDefault();
  };

  const handleVariantStripMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isScrollableVariantStrip) return;
    const strip = stripRef.current;
    const dragState = dragStateRef.current;
    if (!strip || !dragState.dragging) return;

    const deltaX = event.clientX - dragState.startX;
    if (Math.abs(deltaX) > 4) {
      dragState.moved = true;
    }
    if (!dragState.moved) return;

    strip.scrollLeft = dragState.startScrollLeft - deltaX;
  };

  const finishVariantStripDrag = () => {
    if (!isScrollableVariantStrip) return;
    const dragState = dragStateRef.current;
    if (!dragState.dragging) return;

    suppressClickRef.current = dragState.moved;
    dragStateRef.current = {
      dragging: false,
      startX: 0,
      startScrollLeft: 0,
      moved: false,
    };
  };

  const handleVariantButtonClick = (index: number) => (event: React.MouseEvent<HTMLButtonElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onSelect(index);
  };

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
      {hasAnyScans && (
        <div className="mt-2 flex justify-end">
          <div className="flex gap-px rounded-md bg-bg-tertiary/35 p-px">
            <button
              type="button"
              onClick={() => setImagePreference("digital")}
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                imagePreference === "digital"
                  ? "bg-accent text-bg-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Digital
            </button>
            <button
              type="button"
              onClick={() => setImagePreference("scan")}
              className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${
                imagePreference === "scan"
                  ? "bg-accent text-bg-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Scan
            </button>
          </div>
        </div>
      )}

      {/* Variant strip */}
      {variants.length > 1 && (
        <div className="relative mt-3">
          <div
            ref={stripRef}
            className={`${getVariantStripContainerClass(variants.length)} ${isScrollableVariantStrip ? "cursor-grab select-none active:cursor-grabbing" : ""}`}
            onMouseDown={handleVariantStripMouseDown}
            onMouseMove={handleVariantStripMouseMove}
            onMouseUp={finishVariantStripDrag}
            onMouseLeave={finishVariantStripDrag}
          >
            {variants.map((variant, i) => {
              const thumbnailUrl = resolveVariantThumbnailUrl(variant, imagePreference);
              const market = getVariantMarketInfo(variant);
              const marketLabel = fmtPrice(market.marketPrice);
              const variantLabel = variant.label || `Variant ${variant.variant_index}`;
              const variantStripLabel = abbreviateVariantStripLabel(variantLabel);
              const variantMetaLabel = variant.product.set_code
                ? `${variantStripLabel} (${variant.product.set_code})`
                : variantStripLabel;

              return (
                <button
                  key={i}
                  onClick={handleVariantButtonClick(i)}
                  className={getVariantStripItemClass(variants.length, isScrollableVariantStrip)}
                  title={variantLabel}
                >
                  <div
                    className={`rounded-md overflow-hidden border-2 transition-colors ${
                      i === selected ? "border-accent" : "border-transparent hover:border-text-muted/40"
                    }`}
                  >
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={variantLabel}
                        className="pointer-events-none w-full block"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="aspect-[63/88] bg-bg-tertiary text-text-muted text-[9px] flex items-center justify-center">
                        {variant.label || `v${i}`}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 px-0.5 text-[10px] leading-tight">
                    <p className="truncate font-medium text-text-primary">{marketLabel}</p>
                    <p className="truncate text-text-muted">{variantMetaLabel}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function resolveImageDisplayUrl(
  variant: CardVariant | undefined,
  preference: ImagePreference,
): string | null | undefined {
  if (!variant) return null;

  return preference === "scan"
    ? variant.media.scan_url ?? variant.media.image_url
    : variant.media.image_url ?? variant.media.scan_url;
}

function resolveVariantThumbnailUrl(
  variant: CardVariant,
  preference: ImagePreference,
): string | null | undefined {
  return preference === "scan"
    ? variant.media.scan_thumbnail_url
      ?? variant.media.scan_url
      ?? variant.media.thumbnail_url
      ?? variant.media.image_url
    : variant.media.thumbnail_url
      ?? variant.media.image_url
      ?? variant.media.scan_thumbnail_url
      ?? variant.media.scan_url;
}

function getStoredImagePreference(): ImagePreference {
  if (typeof window === "undefined") return "scan";

  const stored = window.localStorage.getItem(IMAGE_AUTO_PREFERENCE_STORAGE_KEY);
  return stored === "digital" ? "digital" : "scan";
}
