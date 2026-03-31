import { Link } from "react-router-dom";
import { useFormat, useFormats } from "../api/hooks";
import type { FormatInfo } from "../api/types";
import { countCurrentRestrictions, countUpcomingChanges, getFormatLegalityBuckets } from "../components/format/formatLegality";
import { PageContainer } from "../components/layout/PageContainer";
import { usePageMeta } from "../hooks/usePageMeta";

export function FormatBrowser() {
  const { data, isLoading } = useFormats();

  usePageMeta({
    title: "Formats",
    description: "One Piece Card Game formats — legality, banlists, and restricted cards for each competitive format.",
    url: "/formats",
  });

  if (isLoading) return <div className="p-8" aria-live="polite"><span className="sr-only">Loading formats</span></div>;

  return (
    <PageContainer
      title="Formats"
      subtitle="Current legality, active banlists, and upcoming format changes."
    >
      <div className="grid gap-4">
        {(data?.data ?? []).map((f) => (
          <FormatCard key={f.name} format={f} />
        ))}
      </div>
    </PageContainer>
  );
}

function FormatCard({ format }: { format: FormatInfo }) {
  const { data, isLoading } = useFormat(format.name);
  const detail = data?.data;
  const buckets = detail ? getFormatLegalityBuckets(detail.bans) : null;
  const activeBannedCount = buckets?.activeBans.length ?? null;
  const activeRestrictionCount = buckets ? countCurrentRestrictions(buckets) : null;
  const upcomingChangeCount = buckets ? countUpcomingChanges(buckets) : null;
  const legalBlockCount = detail?.blocks.filter((block) => block.legal).length ?? format.legal_blocks;

  return (
    <Link
      to={`/formats/${encodeURIComponent(format.name)}`}
      className="block rounded-xl border border-border bg-bg-card/30 p-4 transition-colors hover:bg-bg-hover/50 hover:no-underline"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-text-primary">{format.name}</h2>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              format.has_rotation
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-border bg-bg-primary text-text-secondary"
            }`}>
              {format.has_rotation ? "Rotating" : "No rotation"}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {format.description || "Format legality, active restrictions, and scheduled changes."}
          </p>
        </div>
        <div className="text-xs text-text-muted">
          {isLoading ? "Loading live status..." : "Live status"}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryPill
          tone="default"
          label="Legal blocks"
          value={String(legalBlockCount)}
        />
        <SummaryPill
          tone="banned"
          label="Banned now"
          value={activeBannedCount != null ? String(activeBannedCount) : "—"}
        />
        <SummaryPill
          tone="restricted"
          label="Restrictions now"
          value={activeRestrictionCount != null ? String(activeRestrictionCount) : "—"}
        />
        <SummaryPill
          tone="accent"
          label={detail ? "Upcoming changes" : "Banlist entries"}
          value={detail ? String(upcomingChangeCount ?? 0) : String(format.ban_count)}
        />
      </div>
    </Link>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "banned" | "restricted" | "accent";
}) {
  const toneClass = tone === "banned"
    ? "border-banned/25 bg-banned/10"
    : tone === "restricted"
      ? "border-restricted/25 bg-restricted/10"
      : tone === "accent"
        ? "border-accent/25 bg-accent/10"
        : "border-border bg-bg-primary/60";

  const valueClass = tone === "banned"
    ? "text-banned"
    : tone === "restricted"
      ? "text-restricted"
      : tone === "accent"
        ? "text-accent"
        : "text-text-primary";

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`mt-1 text-base font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}
