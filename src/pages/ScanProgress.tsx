import { useScanProgress } from "../api/hooks";
import { usePageMeta } from "../hooks/usePageMeta";
import type { ScanProgressSet } from "../api/types";

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

function SetRow({ set }: { set: ScanProgressSet }) {
  const cardPercent = pct(set.scanned_cards, set.total_cards);
  const variantPercent = pct(set.scanned_variants, set.total_variants);
  const cardComplete = set.scanned_cards === set.total_cards;
  const variantComplete = set.scanned_variants === set.total_variants;

  return (
    <div className="rounded-lg border border-border bg-bg-card/35 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-mono text-text-secondary">{set.set_code}</span>
        {set.missing_image_cards > 0 ? (
          <span className="text-xs text-banned" title="Cards with no image at all">
            {set.missing_image_cards} cards missing any image
          </span>
        ) : null}
      </div>

      <div className="mt-3 space-y-2.5">
        <div>
          <div className="mb-1 flex justify-between gap-3 text-xs">
            <span className="text-text-secondary">Cards with any scan</span>
            <span className={cardComplete ? "text-legal" : "text-text-muted"}>
              {set.scanned_cards}/{set.total_cards} ({cardPercent}%)
            </span>
          </div>
          <ProgressBar value={set.scanned_cards} max={set.total_cards} color={cardComplete ? "bg-legal" : "bg-accent"} />
        </div>

        <div>
          <div className="mb-1 flex justify-between gap-3 text-xs">
            <span className="text-text-secondary">Variants with their own scan</span>
            <span className={variantComplete ? "text-legal" : "text-text-muted"}>
              {set.scanned_variants}/{set.total_variants} ({variantPercent}%)
            </span>
          </div>
          <ProgressBar value={set.scanned_variants} max={set.total_variants} color={variantComplete ? "bg-legal" : "bg-accent"} />
        </div>
      </div>
    </div>
  );
}

export function ScanProgress() {
  const { data, isLoading } = useScanProgress();

  usePageMeta({
    title: "Scan Progress",
    description: "Track our progress scanning every card in the One Piece Card Game.",
    url: "/scans",
  });

  if (isLoading) return <div className="p-8" aria-live="polite"><span className="sr-only">Loading scan progress</span></div>;
  if (!data) return null;

  const d = data.data;
  const cardPct = pct(d.total_scanned_cards, d.total_cards);
  const variantPct = pct(d.total_scanned_variants, d.total_variants);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-2">Scan Progress</h1>
      <p className="text-text-secondary text-sm mb-6">
        We track scan coverage in two different ways: cards and variants. Cards tell you whether a card number has any
        scan at all. Variants tell you whether each distinct version of that card has its own scan.
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
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Cards With Any Scan" value={`${cardPct}%`} sub={`${d.total_scanned_cards.toLocaleString()} / ${d.total_cards.toLocaleString()}`} />
        <StatCard label="Variants With Their Own Scan" value={`${variantPct}%`} sub={`${d.total_scanned_variants.toLocaleString()} / ${d.total_variants.toLocaleString()}`} />
        <StatCard label="Cards Missing Any Image" value={d.total_missing_image_cards.toLocaleString()} sub="No image at all" />
        <StatCard label="Sets" value={d.sets.length.toLocaleString()} sub={`${d.sets.filter((s) => s.scanned_cards === s.total_cards).length} complete`} />
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
        <h2 className="text-lg font-semibold text-text-primary mb-3">By Set</h2>
        <p className="mb-3 text-sm text-text-secondary">
          Each set row shows both the broader card-level coverage and the stricter variant-level coverage.
        </p>
        <div className="space-y-2">
          {d.sets.map((set) => (
            <SetRow key={set.set_code} set={set} />
          ))}
        </div>
      </div>
    </div>
  );
}
