import { Link, useSearchParams } from "react-router-dom";
import { useSets } from "../api/hooks";
import type { SetSort, SortOrder } from "../api/types";
import { PageContainer } from "../components/layout/PageContainer";

const SORT_LABELS: Record<SetSort, string> = {
  name: "Set Name",
  card_count: "Card Count",
  released: "Release Date",
  set_code: "Set Code",
};

function defaultOrderForSort(sort: SetSort): SortOrder {
  return sort === "released" || sort === "card_count" ? "desc" : "asc";
}

export function SetBrowser() {
  const [params, setParams] = useSearchParams();
  const sort = (params.get("sort") as SetSort | null) || "released";
  const order = (params.get("order") as SortOrder | null) || defaultOrderForSort(sort);
  const { data, isLoading } = useSets({ sort, order });

  function updateParams(nextSort: SetSort, nextOrder: SortOrder) {
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
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <label className="text-[12px] uppercase tracking-wider text-text-muted" htmlFor="set-sort">
            Sort
          </label>
          <select
            id="set-sort"
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary"
            value={sort}
            onChange={(event) => updateParams(event.target.value as SetSort, defaultOrderForSort(event.target.value as SetSort))}
          >
            <option value="released">Release Date</option>
            <option value="name">Set Name</option>
            <option value="card_count">Card Count</option>
            <option value="set_code">Set Code</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[12px] uppercase tracking-wider text-text-muted" htmlFor="set-order">
            Order
          </label>
          <select
            id="set-order"
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary"
            value={order}
            onChange={(event) => updateParams(sort, event.target.value as SortOrder)}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-[12px] uppercase tracking-wider text-text-muted">
            <th className="pb-2 font-medium">
              Set
              {sort === "name" || sort === "set_code" ? <span className="ml-2 normal-case tracking-normal">· {SORT_LABELS[sort]}</span> : null}
            </th>
            <th className="pb-2 text-right font-medium">
              Cards
              {sort === "card_count" ? <span className="ml-2 normal-case tracking-normal">· sorted</span> : null}
            </th>
            <th className="hidden pb-2 text-right font-medium sm:table-cell">
              Released
              {sort === "released" ? <span className="ml-2 normal-case tracking-normal">· sorted</span> : null}
            </th>
          </tr>
        </thead>
        <tbody>
          {sets.map((set) => (
            <tr key={set.code} className="border-b border-border/50 hover:bg-bg-hover/50">
              <td className="py-2">
                <Link to={`/sets/${set.code}`} className="hover:underline">
                  {set.name}
                </Link>
                <span className="ml-2 text-xs font-mono text-text-muted">{set.code}</span>
              </td>
              <td className="py-2 text-right text-text-muted">{set.card_count}</td>
              <td className="hidden py-2 text-right text-text-muted sm:table-cell">
                {set.released_at
                  ? new Date(set.released_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageContainer>
  );
}
