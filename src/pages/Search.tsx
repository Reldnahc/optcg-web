import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCardSearch } from "../api/hooks";
import { usePageMeta } from "../hooks/usePageMeta";
import { CardGrid } from "../components/card/CardGrid";
import { CardChecklist } from "../components/card/CardChecklist";
import { CardTextList } from "../components/card/CardTextList";
import { CardFullList } from "../components/card/CardFullList";
import { ErrorState } from "../components/layout/ErrorState";
import { ColorHexFilter } from "../components/ColorHexFilter";
import { DEFAULT_PAGE_CONTAINER_CLASS } from "../components/layout/container";

const SORT_LABELS: Record<string, string> = {
  relevance: "Relevance",
  card_number: "Number",
  name: "Name",
  cost: "Cost",
  power: "Power",
  released: "Released",
  rarity: "Rarity",
  color: "Color",
  artist: "Artist",
  market_price: "Market Price",
};

const COLOR_CLAUSE_RE = /(?:^|\s)c:([a-z]+(?:,[a-z]+)*)(?=\s|$)/gi;

// Extract standalone c:red,yellow clauses from a query string
function parseColors(q: string): string[] {
  const colors = new Set<string>();
  for (const m of q.matchAll(COLOR_CLAUSE_RE)) {
    m[1]
      .split(",")
      .map((color) => color.trim().toLowerCase())
      .filter(Boolean)
      .forEach((color) => colors.add(color));
  }
  return [...colors];
}

// Remove standalone c:red,yellow clauses from a query string
function stripColorTokens(q: string): string {
  return q.replace(COLOR_CLAUSE_RE, " ").replace(/\s+/g, " ").trim();
}

export function Search() {
  const [params, setParams] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const q = params.get("q") || "";
  const selectedColors = parseColors(q);
  const page = parseInt(params.get("page") || "1", 10);
  const sortParam = params.get("sort");
  const effectiveSort = q
    ? (sortParam || "relevance")
    : (sortParam || "card_number");
  const order = params.get("order") || "asc";
  const unique = params.get("unique") || "prints";
  const as = params.get("as") || "images";

  const searchParams = {
    q: q,
    page: String(page),
    limit: "60",
    unique,
    ...(effectiveSort === "relevance"
      ? { sort: "relevance" }
      : { sort: effectiveSort, order }),
  };

  const { data, isLoading, error } = useCardSearch(searchParams);

  usePageMeta({
    title: q ? `Search: ${q}` : "Search",
    description: q
      ? `Search results for "${q}" in the One Piece TCG card database.`
      : "Search the One Piece Card Game database by name, text, color, type, and more.",
    url: "/search",
  });
  const pagination = data?.pagination;
  const appliedSortMeta = data?.meta;
  const showsAppliedSortNote = Boolean(
    appliedSortMeta
      && (
        appliedSortMeta.sort_requested !== appliedSortMeta.sort_applied
        || appliedSortMeta.order_requested !== appliedSortMeta.order_applied
      ),
  );

  const setColors = (colors: string[]) => {
    const base = stripColorTokens(q);
    const colorClause = colors.length > 0 ? `c:${colors.join(",")}` : "";
    const newQ = [base, colorClause].filter(Boolean).join(" ");
    const next = new URLSearchParams(params);
    if (newQ) {
      next.set("q", newQ);
    } else {
      next.delete("q");
    }
    next.delete("colors");
    next.set("page", "1");
    setParams(next);
  };

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

  const controls = (
    <>
      <ControlGroup label="Display">
        <select
          value={as}
          onChange={(e) => setParam("as", e.target.value)}
          className="bg-bg-input border border-border rounded px-1.5 py-0.5 text-text-primary text-[13px] focus:outline-none focus:border-accent/60"
        >
          <option value="images">Images</option>
          <option value="full">Full</option>
          <option value="text">Text</option>
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
    </>
  );

  return (
    <div className={`${DEFAULT_PAGE_CONTAINER_CLASS} py-4`}>
      {/* Mobile: top bar with pagination + settings */}
      <div className="sm:hidden mb-3">
        <div className="flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => setParam("page", String(page - 1))}
            className="text-text-muted hover:text-text-primary disabled:text-text-muted/40 text-[13px] shrink-0 w-12 text-left"
          >
            &#8249; Prev
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1 text-[11px] text-text-secondary border border-border/40 rounded px-2 py-0.5 shrink-0"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 0 1 1.262.125l.962.962a1 1 0 0 1 .125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.295a1 1 0 0 1 .804.98v1.361a1 1 0 0 1-.804.98l-1.473.295a6.95 6.95 0 0 1-.587 1.416l.834 1.25a1 1 0 0 1-.125 1.262l-.962.962a1 1 0 0 1-1.262.125l-1.25-.834a6.95 6.95 0 0 1-1.416.587l-.295 1.473a1 1 0 0 1-.98.804H9.32a1 1 0 0 1-.98-.804l-.295-1.473a6.95 6.95 0 0 1-1.416-.587l-1.25.834a1 1 0 0 1-1.262-.125l-.962-.962a1 1 0 0 1-.125-1.262l.834-1.25a6.95 6.95 0 0 1-.587-1.416l-1.473-.295A1 1 0 0 1 1 10.68V9.32a1 1 0 0 1 .804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 0 1 .125-1.262l.962-.962A1 1 0 0 1 5.38 3.03l1.25.834a6.95 6.95 0 0 1 1.416-.587l.295-1.473ZM13 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clipRule="evenodd" />
            </svg>
            Settings
            <svg viewBox="0 0 20 20" fill="currentColor" className={`w-2.5 h-2.5 transition-transform ${menuOpen ? "rotate-180" : ""}`}>
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            disabled={!pagination?.has_more}
            onClick={() => setParam("page", String(page + 1))}
            className="text-text-muted hover:text-text-primary disabled:text-text-muted/40 text-[13px] shrink-0 w-12 text-right"
          >
            Next &#8250;
          </button>
        </div>

        {menuOpen && (
          <div className="mt-2 bg-bg-card border border-border/50 rounded-lg p-3 text-[13px]">
            <div className="flex justify-center mb-3">
              <ColorHexFilter selected={selectedColors} onChange={setColors} />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <ControlGroup label="Display">
                <select
                  value={as}
                  onChange={(e) => setParam("as", e.target.value)}
                  className="w-full bg-bg-input border border-border rounded px-1.5 py-1 text-text-primary text-[13px] focus:outline-none focus:border-accent/60"
                >
                  <option value="images">Images</option>
                  <option value="full">Full</option>
                  <option value="text">Text</option>
                  <option value="checklist">Checklist</option>
                </select>
              </ControlGroup>

              <ControlGroup label="Show">
                <select
                  value={unique}
                  onChange={(e) => setParam("unique", e.target.value)}
                  className="w-full bg-bg-input border border-border rounded px-1.5 py-1 text-text-primary text-[13px] focus:outline-none focus:border-accent/60"
                >
                  <option value="prints">Prints</option>
                  <option value="cards">Cards</option>
                </select>
              </ControlGroup>

              <ControlGroup label="Sorted by">
                <div className="flex gap-1">
                  <select
                    value={effectiveSort}
                    onChange={(e) => setParam("sort", e.target.value)}
                    className="flex-1 bg-bg-input border border-border rounded px-1.5 py-1 text-text-primary text-[13px] focus:outline-none focus:border-accent/60"
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
                  {effectiveSort !== "relevance" && (
                    <button
                      onClick={() => setParam("order", order === "asc" ? "desc" : "asc")}
                      className="text-text-muted hover:text-text-primary px-1.5 border border-border rounded bg-bg-input"
                      title={order === "asc" ? "Ascending" : "Descending"}
                    >
                      {order === "asc" ? "\u25B2" : "\u25BC"}
                    </button>
                  )}
                </div>
              </ControlGroup>
            </div>
          </div>
        )}
      </div>

      {/* Desktop: inline controls */}
      <div className="hidden sm:flex flex-wrap items-center gap-3 mb-4 text-[13px]">
        <ColorHexFilter selected={selectedColors} onChange={setColors} />

        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          <div className="text-text-secondary">
            {isLoading && <span className="sr-only">Searching</span>}
            {pagination && (
              <>
                {pagination.total.toLocaleString()} {unique === "cards" ? (pagination.total === 1 ? "card" : "cards") : (pagination.total === 1 ? "print" : "prints")}
                {q && <> where <span className="text-text-primary">{q}</span></>}
                {showsAppliedSortNote && appliedSortMeta && (
                  <>
                    {" "}&middot; applied sort{" "}
                    <span className="text-text-primary">
                      {SORT_LABELS[appliedSortMeta.sort_applied] || appliedSortMeta.sort_applied}
                    </span>
                    {appliedSortMeta.sort_applied !== "relevance" && (
                      <> ({appliedSortMeta.order_applied})</>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {controls}
          </div>
        </div>
      </div>

      {/* Mobile: result count */}
      <div className="sm:hidden text-text-secondary text-[13px] mb-3 text-center">
        {isLoading && <span className="sr-only">Searching</span>}
        {pagination && (
          <>
            {pagination.total.toLocaleString()} {unique === "cards" ? (pagination.total === 1 ? "card" : "cards") : (pagination.total === 1 ? "print" : "prints")}
            {q && <> where <span className="text-text-primary">{q}</span></>}
          </>
        )}
      </div>

      {data && (
        as === "checklist" ? <CardChecklist cards={data.data} />
        : as === "text" ? <CardTextList cards={data.data} />
        : as === "full" ? <CardFullList cards={data.data} />
        : <CardGrid cards={data.data} />
      )}

      {pagination && pagination.total > 0 && (
        <>
          {/* Desktop bottom pagination */}
          <div className="mt-6 hidden sm:flex items-center justify-center gap-4 text-sm">
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

          {/* Mobile bottom pagination */}
          <div className="mt-6 sm:hidden flex items-center justify-between">
            <button
              disabled={page <= 1}
              onClick={() => setParam("page", String(page - 1))}
              className="text-text-muted hover:text-text-primary disabled:text-text-muted/40 text-[13px] shrink-0 w-12 text-left"
            >
              &#8249; Prev
            </button>
            <span className="text-text-muted text-[11px]">
              Page {page} of {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              disabled={!pagination.has_more}
              onClick={() => setParam("page", String(page + 1))}
              className="text-text-muted hover:text-text-primary disabled:text-text-muted/40 text-[13px] shrink-0 w-12 text-right"
            >
              Next &#8250;
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5">
      <span className="text-text-muted text-[12px] sm:text-[13px]">{label}</span>
      {children}
    </div>
  );
}
