import { Link, useSearchParams } from "react-router-dom";
import { useSets } from "../api/hooks";
import type { SetSort, SortOrder } from "../api/types";
import { PageContainer } from "../components/layout/PageContainer";

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
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed text-sm">
          <thead>
            <tr className="border-b border-border text-[12px] uppercase tracking-wider text-text-muted">
              <SortableHeader
                active={sort === "name"}
                align="left"
                label="Set"
                order={order}
                onClick={() => updateParams("name")}
                widthClass="w-[42%]"
              />
              <SortableHeader
                active={sort === "set_code"}
                align="left"
                label="Code"
                monospace
                order={order}
                onClick={() => updateParams("set_code")}
                widthClass="w-[14%]"
              />
              <SortableHeader
                active={sort === "card_count"}
                align="right"
                label="Cards"
                order={order}
                onClick={() => updateParams("card_count")}
                widthClass="w-[14%]"
              />
              <SortableHeader
                active={sort === "released"}
                align="right"
                label="Released"
                order={order}
                onClick={() => updateParams("released")}
                widthClass="w-[30%]"
              />
            </tr>
          </thead>
          <tbody>
            {sets.map((set) => (
              <tr key={set.code} className="border-b border-border/50 hover:bg-bg-hover/50">
                <td className="truncate py-2 pr-4">
                  <Link to={`/sets/${set.code}`} className="font-medium hover:underline">
                    {set.name}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-xs font-mono text-text-muted">
                  {set.code}
                </td>
                <td className="py-2 pr-4 text-right text-text-muted">
                  {set.card_count}
                </td>
                <td className="py-2 text-right text-text-muted">
                  {formatReleasedAt(set.released_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}

function SortableHeader({
  active,
  align,
  label,
  monospace = false,
  order,
  onClick,
  widthClass,
}: {
  active: boolean;
  align: "left" | "right";
  label: string;
  monospace?: boolean;
  order: SortOrder;
  onClick: () => void;
  widthClass: string;
}) {
  const alignmentClass = align === "right" ? "text-right" : "text-left";
  const buttonAlignmentClass = align === "right" ? "justify-end" : "justify-start";

  return (
    <th className={`pb-2 font-medium ${alignmentClass} ${widthClass}`}>
      <button
        className={`flex w-full items-center gap-2 ${buttonAlignmentClass} ${active ? "text-text-primary" : "text-text-muted hover:text-text-primary"} ${monospace ? "font-mono" : ""}`}
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
