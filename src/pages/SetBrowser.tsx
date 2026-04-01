import { Link, useSearchParams } from "react-router-dom";
import { useSets } from "../api/hooks";
import type { SetSort, SortOrder } from "../api/types";
import { PageContainer } from "../components/layout/PageContainer";
import { DataTable, SortableTableHeader } from "../components/table/DataTable";
import { usePageMeta } from "../hooks/usePageMeta";

function defaultOrderForSort(sort: SetSort): SortOrder {
  return sort === "released" || sort === "card_count" ? "desc" : "asc";
}

function formatReleasedAt(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function SetBrowser() {
  const [params, setParams] = useSearchParams();
  const sort = (params.get("sort") as SetSort | null) || "released";
  const order = (params.get("order") as SortOrder | null) || defaultOrderForSort(sort);
  const { data, isLoading } = useSets({ sort, order });

  usePageMeta({
    title: "All Sets",
    description: "Browse all One Piece Card Game sets — booster packs, starter decks, and promotional releases.",
    url: "/sets",
  });

  function updateParams(nextSort: SetSort) {
    const nextOrder: SortOrder = sort === nextSort
      ? (order === "asc" ? "desc" : "asc")
      : defaultOrderForSort(nextSort);
    const next = new URLSearchParams(params);

    if (nextSort === "released") {
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

  if (isLoading) return <div className="p-8 text-text-muted">Loading sets...</div>;

  const sets = data?.data ?? [];

  return (
    <PageContainer title="All Sets" subtitle={`${sets.length} sets found`}>
      {/* Sort controls for mobile */}
      <div className="mb-3 flex items-center gap-2 sm:hidden">
        <span className="text-[11px] uppercase tracking-wider text-text-muted">Sort</span>
        <div className="flex gap-px rounded-md bg-bg-tertiary/35 p-px">
          {(["released", "name", "set_code", "card_count"] as SetSort[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => updateParams(s)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${
                sort === s
                  ? "bg-accent text-bg-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {s === "released" ? "Date" : s === "card_count" ? "Cards" : s === "set_code" ? "Code" : "Name"}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="space-y-2 sm:hidden">
        {sets.map((set) => (
          <Link
            key={set.code}
            to={`/sets/${set.code}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-bg-card/40 px-3 py-2.5 no-underline hover:bg-bg-hover/50"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{set.name}</p>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
                <span className="font-mono">{set.code}</span>
                <span className="text-text-muted/50">&middot;</span>
                <span>{set.card_count} cards</span>
              </div>
            </div>
            <span className="shrink-0 text-xs text-text-muted">{formatReleasedAt(set.released_at)}</span>
          </Link>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden sm:block">
        <DataTable minWidthClass="min-w-[720px]">
          <colgroup>
            <col className="w-[42%]" />
            <col className="w-[14%]" />
            <col className="w-[14%]" />
            <col className="w-[30%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-border text-[12px] uppercase tracking-wider text-text-muted">
              <SortableTableHeader
                active={sort === "name"}
                align="left"
                label="Set"
                order={order}
                onClick={() => updateParams("name")}
              />
              <SortableTableHeader
                active={sort === "set_code"}
                align="left"
                label="Code"
                monospace
                order={order}
                onClick={() => updateParams("set_code")}
              />
              <SortableTableHeader
                active={sort === "card_count"}
                align="right"
                label="Cards"
                order={order}
                onClick={() => updateParams("card_count")}
              />
              <SortableTableHeader
                active={sort === "released"}
                align="right"
                label="Released"
                order={order}
                onClick={() => updateParams("released")}
              />
            </tr>
          </thead>
          <tbody>
            {sets.map((set) => (
              <tr key={set.code} className="border-b border-border/50 hover:bg-bg-hover/50">
                <td className="truncate px-3 py-2">
                  <Link to={`/sets/${set.code}`} className="font-medium hover:underline">
                    {set.name}
                  </Link>
                </td>
                <td className="px-3 py-2 text-xs font-mono text-text-muted">
                  {set.code}
                </td>
                <td className="px-3 py-2 text-right text-text-muted">
                  {set.card_count}
                </td>
                <td className="px-3 py-2 text-right text-text-muted">
                  {formatReleasedAt(set.released_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    </PageContainer>
  );
}
