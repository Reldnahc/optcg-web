import { useQueries } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useFormats } from "../api/hooks";
import type { FormatDetail, FormatInfo, SortOrder } from "../api/types";
import { apiFetch } from "../api/client";
import { countCurrentRestrictions, countUpcomingChanges, getFormatLegalityBuckets } from "../components/format/formatLegality";
import { PageContainer } from "../components/layout/PageContainer";
import { usePageMeta } from "../hooks/usePageMeta";

type FormatSort = "name" | "rotation" | "legal_blocks" | "banned" | "restricted" | "upcoming";

type FormatRow = {
  format: FormatInfo;
  detail: FormatDetail | null;
  legalBlockCount: number;
  activeBannedCount: number | null;
  activeRestrictionCount: number | null;
  upcomingChangeCount: number | null;
};

const SORT_OPTIONS: Array<{ key: FormatSort; label: string }> = [
  { key: "name", label: "Name" },
  { key: "rotation", label: "Rotation" },
  { key: "legal_blocks", label: "Legal blocks" },
  { key: "banned", label: "Banned now" },
  { key: "restricted", label: "Restrictions" },
  { key: "upcoming", label: "Upcoming" },
];

function defaultOrderForSort(sort: FormatSort): SortOrder {
  return sort === "name" ? "asc" : "desc";
}

export function FormatBrowser() {
  const [params, setParams] = useSearchParams();
  const sort = (params.get("sort") as FormatSort | null) || "name";
  const order = (params.get("order") as SortOrder | null) || defaultOrderForSort(sort);
  const { data, isLoading } = useFormats();
  const formats = data?.data ?? [];

  const detailQueries = useQueries({
    queries: formats.map((format) => ({
      queryKey: ["format", format.name],
      queryFn: () => apiFetch<{ data: FormatDetail }>(`/formats/${format.name}`),
      enabled: formats.length > 0,
      staleTime: 5 * 60 * 1000,
    })),
  });

  usePageMeta({
    title: "Formats",
    description: "One Piece Card Game formats — legality, banlists, and restricted cards for each competitive format.",
    url: "/formats",
  });

  function updateParams(nextSort: FormatSort) {
    const nextOrder: SortOrder = sort === nextSort
      ? (order === "asc" ? "desc" : "asc")
      : defaultOrderForSort(nextSort);
    const next = new URLSearchParams(params);

    if (nextSort === "name") {
      next.delete("sort");
    } else {
      next.set("sort", nextSort);
    }

    if (nextOrder === defaultOrderForSort(nextSort)) {
      next.delete("order");
    } else {
      next.set("order", nextOrder);
    }

    setParams(next);
  }

  if (isLoading) {
    return <div className="p-8" aria-live="polite"><span className="sr-only">Loading formats</span></div>;
  }

  const rows = sortFormatRows(
    formats.map((format, index) => buildFormatRow(format, detailQueries[index]?.data?.data ?? null)),
    sort,
    order,
  );
  const loadedDetails = rows.filter((row) => row.detail).length;

  return (
    <PageContainer
      title="Formats"
      subtitle="Current legality, active banlists, and upcoming format changes."
    >
      <div className="mb-3 flex flex-wrap items-center gap-2 sm:hidden">
        <span className="text-[11px] uppercase tracking-wider text-text-muted">Sort</span>
        <div className="flex flex-wrap gap-px rounded-md bg-bg-tertiary/35 p-px">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => updateParams(option.key)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                sort === option.key
                  ? "bg-accent text-bg-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-xs text-text-muted">
        {loadedDetails === rows.length
          ? `${rows.length} formats`
          : `${loadedDetails} of ${rows.length} live format summaries loaded`}
      </p>

      <div className="space-y-2 sm:hidden">
        {rows.map((row) => (
          <Link
            key={row.format.name}
            to={`/formats/${encodeURIComponent(row.format.name)}`}
            className="block rounded-lg border border-border bg-bg-card/40 px-3 py-3 no-underline hover:bg-bg-hover/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">{row.format.name}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {row.format.description || "Format legality, active restrictions, and scheduled changes."}
                </p>
              </div>
              <RotationBadge hasRotation={row.format.has_rotation} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <MobileStat label="Legal blocks" value={String(row.legalBlockCount)} />
              <MobileStat label="Banned now" value={formatCount(row.activeBannedCount)} />
              <MobileStat label="Restrictions" value={formatCount(row.activeRestrictionCount)} />
              <MobileStat label="Upcoming" value={formatCount(row.upcomingChangeCount)} />
            </div>
          </Link>
        ))}
      </div>

      <div className="hidden w-full overflow-x-auto sm:block">
        <table className="w-full min-w-[900px] table-fixed text-sm">
          <thead>
            <tr className="border-b border-border text-[12px] uppercase tracking-wider text-text-muted">
              <SortableHeader
                active={sort === "name"}
                align="left"
                label="Format"
                order={order}
                onClick={() => updateParams("name")}
                widthClass="w-[34%]"
              />
              <SortableHeader
                active={sort === "rotation"}
                align="left"
                label="Rotation"
                order={order}
                onClick={() => updateParams("rotation")}
                widthClass="w-[13%]"
              />
              <SortableHeader
                active={sort === "legal_blocks"}
                align="right"
                label="Legal blocks"
                order={order}
                onClick={() => updateParams("legal_blocks")}
                widthClass="w-[13%]"
              />
              <SortableHeader
                active={sort === "banned"}
                align="right"
                label="Banned now"
                order={order}
                onClick={() => updateParams("banned")}
                widthClass="w-[13%]"
              />
              <SortableHeader
                active={sort === "restricted"}
                align="right"
                label="Restrictions"
                order={order}
                onClick={() => updateParams("restricted")}
                widthClass="w-[13%]"
              />
              <SortableHeader
                active={sort === "upcoming"}
                align="right"
                label="Upcoming"
                order={order}
                onClick={() => updateParams("upcoming")}
                widthClass="w-[14%]"
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.format.name} className="border-b border-border/50 align-top hover:bg-bg-hover/50">
                <td className="py-3 pr-4">
                  <Link to={`/formats/${encodeURIComponent(row.format.name)}`} className="font-medium hover:underline">
                    {row.format.name}
                  </Link>
                  <p className="mt-1 text-xs text-text-muted">
                    {row.format.description || "Format legality, active restrictions, and scheduled changes."}
                  </p>
                </td>
                <td className="py-3 pr-4">
                  <RotationBadge hasRotation={row.format.has_rotation} />
                </td>
                <td className="py-3 pr-4 text-right text-text-secondary">
                  {row.legalBlockCount}
                </td>
                <td className="py-3 pr-4 text-right text-text-secondary">
                  {formatCount(row.activeBannedCount)}
                </td>
                <td className="py-3 pr-4 text-right text-text-secondary">
                  {formatCount(row.activeRestrictionCount)}
                </td>
                <td className="py-3 text-right text-text-secondary">
                  {formatCount(row.upcomingChangeCount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}

function buildFormatRow(format: FormatInfo, detail: FormatDetail | null): FormatRow {
  const buckets = detail ? getFormatLegalityBuckets(detail.bans) : null;

  return {
    format,
    detail,
    legalBlockCount: detail?.blocks.filter((block) => block.legal).length ?? format.legal_blocks,
    activeBannedCount: buckets?.activeBans.length ?? null,
    activeRestrictionCount: buckets ? countCurrentRestrictions(buckets) : null,
    upcomingChangeCount: buckets ? countUpcomingChanges(buckets) : null,
  };
}

function sortFormatRows(rows: FormatRow[], sort: FormatSort, order: SortOrder): FormatRow[] {
  return [...rows].sort((a, b) => {
    const direction = order === "asc" ? 1 : -1;

    if (sort === "name") {
      return direction * a.format.name.localeCompare(b.format.name, undefined, { numeric: true });
    }

    if (sort === "rotation") {
      const delta = Number(a.format.has_rotation) - Number(b.format.has_rotation);
      if (delta !== 0) return direction * delta;
      return a.format.name.localeCompare(b.format.name, undefined, { numeric: true });
    }

    const left = getNumericSortValue(a, sort);
    const right = getNumericSortValue(b, sort);

    if (left == null && right == null) {
      return a.format.name.localeCompare(b.format.name, undefined, { numeric: true });
    }

    if (left == null) return 1;
    if (right == null) return -1;
    if (left !== right) return direction * (left - right);
    return a.format.name.localeCompare(b.format.name, undefined, { numeric: true });
  });
}

function getNumericSortValue(row: FormatRow, sort: Exclude<FormatSort, "name" | "rotation">): number | null {
  if (sort === "legal_blocks") return row.legalBlockCount;
  if (sort === "banned") return row.activeBannedCount;
  if (sort === "restricted") return row.activeRestrictionCount;
  return row.upcomingChangeCount;
}

function formatCount(value: number | null): string {
  return value == null ? "—" : String(value);
}

function RotationBadge({ hasRotation }: { hasRotation: boolean }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
      hasRotation
        ? "border-accent/30 bg-accent/10 text-accent"
        : "border-border bg-bg-primary text-text-secondary"
    }`}>
      {hasRotation ? "Rotating" : "No rotation"}
    </span>
  );
}

function MobileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-bg-primary/60 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function SortableHeader({
  active,
  align,
  label,
  order,
  onClick,
  widthClass,
}: {
  active: boolean;
  align: "left" | "right";
  label: string;
  order: SortOrder;
  onClick: () => void;
  widthClass: string;
}) {
  const alignmentClass = align === "right" ? "text-right" : "text-left";
  const buttonAlignmentClass = align === "right" ? "justify-end" : "justify-start";

  return (
    <th className={`pb-2 font-medium ${alignmentClass} ${widthClass}`}>
      <button
        className={`flex w-full items-center gap-2 ${buttonAlignmentClass} ${active ? "text-text-primary" : "text-text-muted hover:text-text-primary"}`}
        onClick={onClick}
        type="button"
      >
        <span>{label}</span>
        <span className="inline-block w-4 text-center font-mono text-[11px]">
          {active ? (order === "asc" ? "^" : "v") : ""}
        </span>
      </button>
    </th>
  );
}
