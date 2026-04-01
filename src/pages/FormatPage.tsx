import { useState } from "react";
import { useParams } from "react-router-dom";
import { useFormat } from "../api/hooks";
import { CardHoverPreviewLink } from "../components/card/CardHoverPreviewLink";
import {
  countCurrentRestrictions,
  countUpcomingChanges,
  getFormatLegalityBuckets,
  isFutureDate,
  type DisplayBan,
} from "../components/format/formatLegality";
import { ErrorState } from "../components/layout/ErrorState";
import { PageContainer } from "../components/layout/PageContainer";
import { DataTable, SortableTableHeader } from "../components/table/DataTable";
import { usePageMeta } from "../hooks/usePageMeta";

export function FormatPage() {
  const { name } = useParams<{ name: string }>();
  const { data, isLoading, error } = useFormat(name!);
  const format = data?.data;

  usePageMeta({
    title: format?.name,
    description: format?.description || (format ? `${format.name} - One Piece TCG format legality, banlists, and legal sets.` : undefined),
  });

  if (isLoading) return <div className="p-8" aria-live="polite"><span className="sr-only">Loading format</span></div>;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!format) return null;

  const legalBlocks = format.blocks.filter((block) => block.legal);
  const rotatingSoonBlocks = legalBlocks.filter((block) => isFutureDate(block.rotated_at));
  const stableLegalBlocks = legalBlocks.filter((block) => !isFutureDate(block.rotated_at));
  const rotatedBlocks = format.blocks.filter((block) => !block.legal);

  const buckets = getFormatLegalityBuckets(format.bans);
  const activeRestrictionCount = countCurrentRestrictions(buckets);
  const upcomingChangeCount = countUpcomingChanges(buckets);
  const activeEntries = [...buckets.activeBans, ...buckets.activeRestrictions, ...buckets.activePairs];
  const upcomingEntries = [...buckets.upcomingBans, ...buckets.upcomingRestrictions, ...buckets.upcomingPairs];

  return (
    <PageContainer
      title={format.name}
      subtitle={format.description || "Live legality, active restrictions, and scheduled format changes."}
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Legal Blocks"
          value={String(legalBlocks.length)}
          sub={rotatingSoonBlocks.length > 0 ? `${rotatingSoonBlocks.length} rotate soon` : "Current block pool"}
          tone="legal"
        />
        <StatCard
          label="Banned Now"
          value={String(buckets.activeBans.length)}
          sub="Currently effective bans"
          tone="banned"
        />
        <StatCard
          label="Restrictions Now"
          value={String(activeRestrictionCount)}
          sub="Restricted and pair bans"
          tone="restricted"
        />
        <StatCard
          label="Upcoming Changes"
          value={String(upcomingChangeCount)}
          sub="Scheduled format updates"
          tone="accent"
        />
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">
          Legal Blocks ({legalBlocks.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {stableLegalBlocks.map((block) => (
            <BlockPill key={`legal-${block.block}`} block={block.block} />
          ))}
          {rotatingSoonBlocks.map((block) => (
            <BlockPill
              key={`rotating-${block.block}`}
              block={block.block}
              note={`rotates ${formatUTCDate(block.rotated_at!)}`}
              accent
            />
          ))}
        </div>
      </section>

      {rotatedBlocks.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            Rotated Blocks ({rotatedBlocks.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {rotatedBlocks.map((block) => (
              <BlockPill
                key={`rotated-${block.block}`}
                block={block.block}
                note={block.rotated_at ? `rotated ${formatUTCDate(block.rotated_at)}` : undefined}
                muted
              />
            ))}
          </div>
        </section>
      )}

      {upcomingEntries.length > 0 && (
        <BanSection
          title={`Upcoming Changes (${upcomingEntries.length})`}
          subtitle="Scheduled changes that are announced but not active yet."
          entries={upcomingEntries}
          upcoming
        />
      )}

      {activeEntries.length > 0 && (
        <BanSection
          title={`Current Restrictions (${activeEntries.length})`}
          subtitle="Only entries that are currently effective are shown here."
          entries={activeEntries}
        />
      )}
    </PageContainer>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "legal" | "banned" | "restricted" | "accent";
}) {
  const toneClass = tone === "legal"
    ? "border-legal/25 bg-legal/10 text-legal"
    : tone === "banned"
      ? "border-banned/25 bg-banned/10 text-banned"
      : tone === "restricted"
        ? "border-restricted/25 bg-restricted/10 text-restricted"
        : "border-accent/25 bg-accent/10 text-accent";

  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{sub}</p>
    </div>
  );
}

function BlockPill({
  block,
  note,
  accent = false,
  muted = false,
}: {
  block: string;
  note?: string;
  accent?: boolean;
  muted?: boolean;
}) {
  const className = accent
    ? "border-accent/30 bg-accent/10 text-accent"
    : muted
      ? "border-border bg-bg-card text-text-muted"
      : "border-legal/20 bg-legal/10 text-legal";

  return (
    <span className={`rounded-md border px-2.5 py-1 text-sm ${className}`}>
      Block {block}
      {note ? <span className="ml-1 text-xs">{note}</span> : null}
    </span>
  );
}

function BanSection({
  title,
  subtitle,
  entries,
  upcoming = false,
}: {
  title: string;
  subtitle: string;
  entries: DisplayBan[];
  upcoming?: boolean;
}) {
  const [sort, setSort] = useState<BanTableSort>("date");
  const [order, setOrder] = useState<"asc" | "desc">(upcoming ? "asc" : "desc");
  const sortedEntries = sortBanEntries(entries, sort, order);

  function updateSort(nextSort: BanTableSort) {
    if (sort === nextSort) {
      setOrder((current) => current === "asc" ? "desc" : "asc");
      return;
    }

    setSort(nextSort);
    setOrder(nextSort === "date"
      ? (upcoming ? "asc" : "desc")
      : "asc");
  }

  return (
    <section className="mb-6 last:mb-0">
      <div className="mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">{title}</h2>
        <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
      </div>
      <DataTable minWidthClass="min-w-[42rem]">
          <colgroup>
            <col className="w-[22%]" />
            <col className="w-[20%]" />
            <col className="w-[16%]" />
            <col className="w-[42%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border text-left text-[12px] text-text-muted">
              <SortableTableHeader
                active={sort === "card"}
                label="Card"
                order={order}
                onClick={() => updateSort("card")}
              />
              <SortableTableHeader
                active={sort === "status"}
                label="Status"
                order={order}
                onClick={() => updateSort("status")}
              />
              <SortableTableHeader
                active={sort === "date"}
                label={upcoming ? "Effective" : "Since"}
                order={order}
                onClick={() => updateSort("date")}
              />
              <SortableTableHeader
                active={sort === "details"}
                label="Details"
                order={order}
                onClick={() => updateSort("details")}
              />
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((ban) => (
              <tr key={`${ban.card_number}-${ban.type}-${ban.banned_at}`} className="border-b border-border/50 last:border-b-0">
                <td className="px-3 py-2 align-top">
                  <CardHoverPreviewLink
                    cardNumber={ban.card_number}
                    className={`font-mono hover:text-link ${upcoming ? "text-text-secondary" : ""}`}
                    previewPosition="top"
                  >
                    {ban.card_number}
                  </CardHoverPreviewLink>
                </td>
                <td className="px-3 py-2 align-top">
                  <StatusBadge ban={ban} upcoming={upcoming} />
                </td>
                <td className={`px-3 py-2 align-top ${upcoming ? "text-text-secondary" : "text-text-muted"}`}>
                  {formatUTCDate(ban.banned_at)}
                </td>
                <td className={`px-3 py-2 align-top ${upcoming ? "text-text-secondary" : "text-text-muted"}`}>
                  {ban.type === "pair" && ban.paired_with.length > 0
                    ? <>with {renderPairedCards(ban.paired_with, upcoming)}</>
                    : ban.reason || "-"}
                </td>
              </tr>
            ))}
          </tbody>
      </DataTable>
    </section>
  );
}

type BanTableSort = "card" | "status" | "date" | "details";

function sortBanEntries(entries: DisplayBan[], sort: BanTableSort, order: "asc" | "desc"): DisplayBan[] {
  return [...entries].sort((a, b) => {
    let delta = 0;

    if (sort === "card") {
      delta = a.card_number.localeCompare(b.card_number, undefined, { numeric: true });
    } else if (sort === "status") {
      delta = getBanStatusLabel(a).localeCompare(getBanStatusLabel(b), undefined, { numeric: true });
    } else if (sort === "date") {
      delta = new Date(a.banned_at).getTime() - new Date(b.banned_at).getTime();
    } else {
      delta = getBanDetailsText(a).localeCompare(getBanDetailsText(b), undefined, { numeric: true });
    }

    if (delta !== 0) {
      return order === "asc" ? delta : -delta;
    }

    return a.card_number.localeCompare(b.card_number, undefined, { numeric: true });
  });
}

function StatusBadge({ ban, upcoming }: { ban: DisplayBan; upcoming: boolean }) {
  const className = upcoming
    ? "border-accent/30 bg-accent/10 text-accent"
    : ban.type === "banned"
      ? "border-banned/30 bg-banned/10 text-banned"
      : ban.type === "restricted"
        ? "border-restricted/30 bg-restricted/10 text-restricted"
        : "border-pair/30 bg-pair/10 text-pair";

  const label = getBanStatusLabel(ban);

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {label}
    </span>
  );
}

function formatUTCDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getBanStatusLabel(ban: DisplayBan): string {
  return ban.type === "pair"
    ? "Pair Ban"
    : ban.type === "restricted"
      ? `Restricted (${ban.max_copies ?? 1})`
      : "Banned";
}

function getBanDetailsText(ban: DisplayBan): string {
  if (ban.type === "pair" && ban.paired_with.length > 0) {
    return `with ${ban.paired_with.join(", ")}`;
  }

  return ban.reason || "";
}

function renderPairedCards(cardNumbers: string[], muted = false) {
  return cardNumbers.map((cardNumber, index) => (
    <span key={cardNumber}>
      {index > 0 && (index === cardNumbers.length - 1 ? " or " : ", ")}
      <CardHoverPreviewLink
        cardNumber={cardNumber}
        className={`font-mono text-link hover:text-link-hover ${muted ? "text-link/80" : ""}`}
        previewPosition="top"
      >
        {cardNumber}
      </CardHoverPreviewLink>
    </span>
  ));
}
