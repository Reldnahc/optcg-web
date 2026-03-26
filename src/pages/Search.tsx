import { useSearchParams } from "react-router-dom";
import { useCardSearch } from "../api/hooks";
import { CardGrid } from "../components/card/CardGrid";
import { CardChecklist } from "../components/card/CardChecklist";
import { ErrorState } from "../components/layout/ErrorState";

export function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const page = parseInt(params.get("page") || "1", 10);
  const sortParam = params.get("sort");
  const effectiveSort = q
    ? (sortParam || "relevance")
    : (sortParam || "card_number");
  const order = params.get("order") || "asc";
  const unique = params.get("unique") || "prints";
  const as = params.get("as") || "images";

  const searchParams = {
    q,
    page: String(page),
    limit: "60",
    unique,
    ...(effectiveSort === "relevance"
      ? { sort: "relevance" }
      : { sort: effectiveSort, order }),
  };

  const { data, isLoading, error } = useCardSearch(searchParams);
  const pagination = data?.pagination;

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (key === "sort" && value === "relevance") {
      next.delete("sort");
    } else {
      next.set(key, value);
    }
    if (key !== "page") next.set("page", "1");
    setParams(next);
  };

  if (error) {
    return <ErrorState message={(error as Error).message} />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 text-[13px]">
        <div className="text-text-secondary">
          {isLoading && <span className="sr-only">Searching</span>}
          {pagination && (
            <>
              {pagination.total.toLocaleString()} result{pagination.total !== 1 && "s"}
              {q && <> where <span className="text-text-primary">{q}</span></>}
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ControlGroup label="Display">
            <select
              value={as}
              onChange={(e) => setParam("as", e.target.value)}
              className="bg-bg-input border border-border rounded px-1.5 py-0.5 text-text-primary text-[13px] focus:outline-none focus:border-accent/60"
            >
              <option value="images">Images</option>
              <option value="checklist">Checklist</option>
            </select>
          </ControlGroup>

          <ControlGroup label="Show">
            <select
              value={unique}
              onChange={(e) => setParam("unique", e.target.value)}
              className="bg-bg-input border border-border rounded px-1.5 py-0.5 text-text-primary text-[13px] focus:outline-none focus:border-accent/60"
            >
              <option value="prints">Prints</option>
              <option value="cards">Cards</option>
            </select>
          </ControlGroup>

          <ControlGroup label="Sorted by">
            <select
              value={effectiveSort}
              onChange={(e) => setParam("sort", e.target.value)}
              className="bg-bg-input border border-border rounded px-1.5 py-0.5 text-text-primary text-[13px] focus:outline-none focus:border-accent/60"
            >
              {q && <option value="relevance">Relevance</option>}
              <option value="card_number">Number</option>
              <option value="name">Name</option>
              <option value="cost">Cost</option>
              <option value="power">Power</option>
              <option value="released">Released</option>
              <option value="rarity">Rarity</option>
              <option value="color">Color</option>
            </select>
          </ControlGroup>

          {effectiveSort !== "relevance" && (
            <button
              onClick={() => setParam("order", order === "asc" ? "desc" : "asc")}
              className="text-text-muted hover:text-text-primary px-1"
              title={order === "asc" ? "Ascending" : "Descending"}
            >
              {order === "asc" ? "\u25B2" : "\u25BC"}
            </button>
          )}
        </div>
      </div>

      {data && (
        as === "checklist"
          ? <CardChecklist cards={data.data} />
          : <CardGrid cards={data.data} />
      )}

      {pagination && pagination.total > 0 && (
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setParam("page", String(page - 1))}
            className="text-link hover:text-link-hover disabled:text-text-muted disabled:no-underline hover:underline"
          >
            &laquo; Previous
          </button>
          <span className="text-text-muted text-[13px]">
            Page {page} of {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button
            disabled={!pagination.has_more}
            onClick={() => setParam("page", String(page + 1))}
            className="text-link hover:text-link-hover disabled:text-text-muted disabled:no-underline hover:underline"
          >
            Next &raquo;
          </button>
        </div>
      )}
    </div>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-text-muted">{label}</span>
      {children}
    </div>
  );
}
