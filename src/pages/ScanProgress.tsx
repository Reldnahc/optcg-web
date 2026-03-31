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

function SetRow({ set, mode }: { set: ScanProgressSet; mode: "cards" | "variants" }) {
  const scanned = mode === "cards" ? set.scanned_cards : set.scanned_variants;
  const total = mode === "cards" ? set.total_cards : set.total_variants;
  const percent = pct(scanned, total);
  const complete = scanned === total;

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-sm font-mono text-text-secondary w-16 shrink-0">{set.set_code}</span>
      <div className="flex-1 min-w-0">
        <ProgressBar value={scanned} max={total} color={complete ? "bg-legal" : "bg-accent"} />
      </div>
      <span className={`text-xs tabular-nums w-24 text-right shrink-0 ${complete ? "text-legal" : "text-text-muted"}`}>
        {scanned}/{total} ({percent}%)
      </span>
      {mode === "cards" && set.missing_image_cards > 0 && (
        <span className="text-xs text-banned shrink-0" title="Cards with no image at all">
          {set.missing_image_cards} missing
        </span>
      )}
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
        We're working on scanning every card in the One Piece Card Game. Here's where we stand.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Cards Scanned" value={`${cardPct}%`} sub={`${d.total_scanned_cards.toLocaleString()} / ${d.total_cards.toLocaleString()}`} />
        <StatCard label="Variants Scanned" value={`${variantPct}%`} sub={`${d.total_scanned_variants.toLocaleString()} / ${d.total_variants.toLocaleString()}`} />
        <StatCard label="Missing Images" value={d.total_missing_image_cards.toLocaleString()} sub="No image at all" />
        <StatCard label="Sets" value={d.sets.length.toLocaleString()} sub={`${d.sets.filter((s) => s.scanned_cards === s.total_cards).length} complete`} />
      </div>

      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-text-primary">Overall</h2>
        </div>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>Cards</span>
              <span>{d.total_scanned_cards.toLocaleString()} / {d.total_cards.toLocaleString()}</span>
            </div>
            <ProgressBar value={d.total_scanned_cards} max={d.total_cards} />
          </div>
          <div>
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>Variants</span>
              <span>{d.total_scanned_variants.toLocaleString()} / {d.total_variants.toLocaleString()}</span>
            </div>
            <ProgressBar value={d.total_scanned_variants} max={d.total_variants} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">By Set</h2>
        <div className="space-y-0.5">
          {d.sets.map((set) => (
            <SetRow key={set.set_code} set={set} mode="cards" />
          ))}
        </div>
      </div>
    </div>
  );
}
