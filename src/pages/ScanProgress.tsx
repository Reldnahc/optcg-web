import { useSearchParams } from "react-router-dom";
import { useScanProgress } from "../api/hooks";
import { ErrorState } from "../components/layout/ErrorState";
import { usePageMeta } from "../hooks/usePageMeta";
import type { ScanProgressGroup } from "../api/types";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  ja: "Japanese",
  fr: "French",
  zh: "Chinese",
};

const LANGUAGE_SHORT_LABELS: Record<string, string> = {
  en: "EN",
  ja: "JA",
  fr: "FR",
  zh: "ZH",
};
const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_SHORT_LABELS);

function pct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((n / total) * 1000) / 10;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-lg px-4 py-3 text-center">
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted mt-0.5">{label}</p>
      {sub && <p className="text-xs text-text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, max, color = "bg-accent" }: { value: number; max: number; color?: string }) {
  const p = max === 0 ? 0 : (value / max) * 100;
  return (
    <div className="h-2 w-full rounded-full bg-bg-tertiary overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${p}%` }} />
    </div>
  );
}

function GroupRow({ group }: { group: ScanProgressGroup }) {
  const cardPercent = pct(group.scanned_cards, group.total_cards);
  const variantPercent = pct(group.scanned_variants, group.total_variants);
  const cardComplete = group.scanned_cards === group.total_cards;
  const variantComplete = group.scanned_variants === group.total_variants;
  const groupTitle = group.bucket_type === "other_products"
    ? `${group.bucket_label} (${group.product_count} products)`
    : group.bucket_label;

  return (
    <div className="rounded-lg border border-border bg-bg-card/35 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className={`text-sm ${group.bucket_type === "other_products" ? "text-text-secondary" : "font-mono text-text-secondary"}`}>
          {groupTitle}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs">
          {group.cards_without_image_or_scan > 0 ? (
            <span className="text-banned" title="Card numbers in this bucket where no variant has an image or scan">
              {group.cards_without_image_or_scan} cards have no image or scan
            </span>
          ) : null}
          {group.variants_without_image > 0 ? (
            <span className="text-accent" title="Variants in this bucket with no canonical image">
              {group.variants_without_image} variants have no image
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-2.5">
        <div>
          <div className="mb-1 flex justify-between gap-3 text-xs">
            <span className="text-text-secondary">Cards with any scan</span>
            <span className={cardComplete ? "text-legal" : "text-text-muted"}>
              {group.scanned_cards}/{group.total_cards} ({cardPercent}%)
            </span>
          </div>
          <ProgressBar value={group.scanned_cards} max={group.total_cards} color={cardComplete ? "bg-legal" : "bg-accent"} />
        </div>

        <div>
          <div className="mb-1 flex justify-between gap-3 text-xs">
            <span className="text-text-secondary">Variants with their own scan</span>
            <span className={variantComplete ? "text-legal" : "text-text-muted"}>
              {group.scanned_variants}/{group.total_variants} ({variantPercent}%)
            </span>
          </div>
          <ProgressBar value={group.scanned_variants} max={group.total_variants} color={variantComplete ? "bg-legal" : "bg-accent"} />
        </div>
      </div>
    </div>
  );
}

export function ScanProgress() {
  const [params, setParams] = useSearchParams();
  const requestedLang = (params.get("lang") || "en").toLowerCase();
  const lang = SUPPORTED_LANGUAGES.includes(requestedLang) ? requestedLang : "en";
  const { data, isLoading, error } = useScanProgress(lang);
  const languageLabel = LANGUAGE_LABELS[lang] || lang.toUpperCase();

  const switchLang = (code: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (code === "en") {
        next.delete("lang");
      } else {
        next.set("lang", code);
      }
      return next;
    }, { replace: true });
  };

  usePageMeta({
    title: lang === "en" ? "Scan Progress" : `${languageLabel} Scan Progress`,
    description: `Track our progress scanning every ${languageLabel.toLowerCase()} One Piece Card Game card.`,
    url: lang === "en" ? "/scans" : `/scans?lang=${encodeURIComponent(lang)}`,
  });

  if (isLoading) return <div className="p-8" aria-live="polite"><span className="sr-only">Loading scan progress</span></div>;
  if (error) return <ErrorState message={(error as Error).message} wide />;
  if (!data) return null;

  const d = data.data;
  const cardPct = pct(d.total_scanned_cards, d.total_cards);
  const variantPct = pct(d.total_scanned_variants, d.total_variants);
  const completeGroupCount = d.groups.filter((group) => group.scanned_cards === group.total_cards).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Scan Progress</h1>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-wide text-text-muted">
          Language: <span className="text-text-primary">{languageLabel}</span>
        </p>
        <div className="flex gap-px rounded-md border border-border bg-bg-tertiary/30 p-px">
          {Object.entries(LANGUAGE_SHORT_LABELS).map(([code, shortLabel]) => (
            <button
              key={code}
              type="button"
              onClick={() => switchLang(code)}
              className={`min-w-9 rounded px-2 py-0.75 text-[11px] font-medium transition-colors ${
                lang === code
                  ? "bg-accent text-bg-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {shortLabel}
            </button>
          ))}
        </div>
      </div>
      <p className="text-text-secondary text-sm mb-6">
        We track scan coverage in two different ways: cards and variants. Cards tell you whether a card number has any
        scan at all. Variants tell you whether each distinct version of that card has its own scan. Progress buckets are
        based on product buckets, not raw card set codes.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 mb-8">
        <div className="rounded-lg border border-border bg-bg-card/35 px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Cards</p>
          <p className="mt-2 text-sm text-text-secondary">
            A card is the base record, usually identified by card number like `OP01-001`. Card progress answers:
            &quot;Do we have at least one scan for this card?&quot;
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-card/35 px-4 py-4">
          <p className="text-xs uppercase tracking-wide text-text-muted">Variants</p>
          <p className="mt-2 text-sm text-text-secondary">
            A variant is a specific print or art version of that card. Variant progress answers: &quot;Do we have scans for
            each individual version, not just the card in general?&quot;
          </p>
        </div>
        <div className="rounded-lg border border-border bg-bg-card/35 px-4 py-4 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-text-muted">Product Buckets</p>
          <p className="mt-2 text-sm text-text-secondary">
            Scan progress is grouped by products. Products whose `product_set_code` matches a known set get their own
            bucket by set code. Everything else is grouped into one `Other Products` bucket.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Cards With Any Scan" value={`${cardPct}%`} sub={`${d.total_scanned_cards.toLocaleString()} / ${d.total_cards.toLocaleString()}`} />
        <StatCard label="Variants With Their Own Scan" value={`${variantPct}%`} sub={`${d.total_scanned_variants.toLocaleString()} / ${d.total_variants.toLocaleString()}`} />
        <StatCard label="Cards With No Image Or Scan" value={d.total_cards_without_image_or_scan.toLocaleString()} sub="No variant image or scan" />
        <StatCard label="Variants Without Image" value={d.total_variants_without_image.toLocaleString()} sub="Image missing on the variant" />
      </div>

      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-text-primary">Overall</h2>
        </div>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>Cards with any scan</span>
              <span>{d.total_scanned_cards.toLocaleString()} / {d.total_cards.toLocaleString()}</span>
            </div>
            <ProgressBar value={d.total_scanned_cards} max={d.total_cards} />
            <p className="mt-1 text-xs text-text-secondary">
              This reaches 100% when every card number has at least one usable scan.
            </p>
          </div>
          <div>
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>Variants with their own scan</span>
              <span>{d.total_scanned_variants.toLocaleString()} / {d.total_variants.toLocaleString()}</span>
            </div>
            <ProgressBar value={d.total_scanned_variants} max={d.total_variants} />
            <p className="mt-1 text-xs text-text-secondary">
              This reaches 100% only when every separate version of every card has its own scan.
            </p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary">By Product Bucket</h2>
          <p className="text-xs text-text-muted">
            {completeGroupCount} / {d.groups.length} buckets card-complete
          </p>
        </div>
        <p className="mb-3 text-sm text-text-secondary">
          Each bucket row shows both the broader card-level coverage and the stricter variant-level coverage. A bucket
          only counts as card-complete when every card number in that bucket has at least one scan.
        </p>
        <div className="space-y-2">
          {d.groups.map((group) => (
            <GroupRow key={group.bucket_key} group={group} />
          ))}
        </div>
      </div>
    </div>
  );
}
