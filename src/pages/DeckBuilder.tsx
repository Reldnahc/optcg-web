import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useCard, useCardSearch, useCardsBatch } from "../api/hooks";
import type { Card, CardDetail } from "../api/types";
import { CopyButton } from "../components/CopyButton";
import { CardRulesText } from "../components/card/CardRulesText";
import { TriggerBlock } from "../components/card/TriggerBlock";
import { ErrorState } from "../components/layout/ErrorState";
import { DEFAULT_PAGE_CONTAINER_CLASS } from "../components/layout/container";
import { useDebounce } from "../hooks/useDebounce";
import { usePageMeta } from "../hooks/usePageMeta";
import { createEmptyDeck, decodeDeckHash, deckHashToEditPath, deckHashToViewPath, encodeDeckHash } from "../decks/hash";
import { createSavedDeckRecord, getSavedDeckRecord, getSavedDeckRecordByHash, upsertSavedDeckRecord } from "../decks/library";
import {
  addCardToDeck,
  buildDeckExport,
  mainDeckCount,
  removeLeader,
  sortedDeckEntries,
  uniqueDeckCardNumbers,
  uniqueMainCount,
  updateMainDeckCount,
} from "../decks/model";
import type { Deck, DeckEntry } from "../decks/types";

type DeckBuilderMode = "edit" | "view";
type SyntaxField = "cost" | "power" | "counter";
type SyntaxOperator = ">" | "<" | "=" | ">=" | "<=";
type SyntaxDraft = { operator: SyntaxOperator; value: string };
type DeckChartMode = "curve" | "counter" | "types";
type DeckCurveSegment = {
  key: string;
  label: string;
  count: number;
  colorClass: string;
  percentOfBin: number;
};
type DeckCurveBin = {
  label: string;
  count: number;
  height: number;
  segments: DeckCurveSegment[];
};
const SYNTAX_OPERATORS: SyntaxOperator[] = [">=", "<=", "=", ">", "<"];
const COUNTER_VALUES = ["", "1000", "2000"] as const;
const DeckViewActionIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const DeckEditActionIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20h9" />
    <path d="m16.5 3.5 4 4L8 20l-5 1 1-5 12.5-12.5Z" />
  </svg>
);
const DeckSaveActionIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
    <path d="M17 21v-8H7v8" />
    <path d="M7 3v5h8" />
  </svg>
);
const DECK_HEADER_ACTION_CLASS = "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-bg-tertiary/40 px-2.5 text-[11px] font-medium leading-none text-text-primary transition hover:bg-bg-hover";

export function NewDeckRedirect() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const emptyDeck = createEmptyDeck();

    void encodeDeckHash(emptyDeck).then((hash) => {
      if (!cancelled) {
        navigate(deckHashToEditPath(hash), { replace: true });
      }
    }).catch((nextError: unknown) => {
      if (!cancelled) {
        setError(nextError instanceof Error ? nextError.message : "Could not create deck.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (error) {
    return (
      <div className={`${DEFAULT_PAGE_CONTAINER_CLASS} py-6`}>
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <div className={`${DEFAULT_PAGE_CONTAINER_CLASS} py-6`}>
      <p className="text-text-secondary">Creating deck...</p>
    </div>
  );
}

export function DeckEditPage() {
  return <DeckBuilderPage mode="edit" />;
}

export function DeckViewPage() {
  return <DeckBuilderPage mode="view" />;
}

export function LegacyDeckViewRedirect() {
  const { hash } = useParams<{ hash: string }>();
  if (!hash) return <Navigate to="/decks/new" replace />;
  return <Navigate to={deckHashToViewPath(hash)} replace />;
}

function DeckBuilderPage({ mode }: { mode: DeckBuilderMode }) {
  const { hash } = useParams<{ hash: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [currentHash, setCurrentHash] = useState<string | null>(hash ?? null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [syntaxHelperOpen, setSyntaxHelperOpen] = useState(false);
  const [curveOpen, setCurveOpen] = useState(true);
  const [deckChartMode, setDeckChartMode] = useState<DeckChartMode>("curve");
  const [curveTooltip, setCurveTooltip] = useState<{
    x: number;
    y: number;
    costLabel: string;
    seriesLabel: string;
    segmentLabel: string;
    count: number;
  } | null>(null);
  const [searchPage, setSearchPage] = useState(1);
  const [loadedSearchResults, setLoadedSearchResults] = useState<Card[]>([]);
  const [savedDeckRevision, setSavedDeckRevision] = useState(0);
  const [syntaxDrafts, setSyntaxDrafts] = useState<Record<SyntaxField, SyntaxDraft>>({
    cost: { operator: ">=", value: "" },
    power: { operator: ">=", value: "" },
    counter: { operator: ">=", value: "" },
  });
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  const hydratedHashRef = useRef<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const explicitSavedDeckId = useMemo(() => new URLSearchParams(location.search).get("saved"), [location.search]);
  const explicitSavedDeck = useMemo(
    () => explicitSavedDeckId ? getSavedDeckRecord(explicitSavedDeckId) : null,
    [explicitSavedDeckId, savedDeckRevision],
  );
  const matchedSavedDeck = useMemo(
    () => explicitSavedDeckId || !hash ? null : getSavedDeckRecordByHash(hash),
    [explicitSavedDeckId, hash, savedDeckRevision],
  );
  const savedDeckRecord = explicitSavedDeck ?? matchedSavedDeck;
  const savedDeckId = savedDeckRecord?.id ?? null;

  useEffect(() => {
    if (!hash || explicitSavedDeckId || !matchedSavedDeck) return;

    navigate(
      mode === "edit"
        ? deckHashToEditPath(hash, matchedSavedDeck.id)
        : deckHashToViewPath(hash, matchedSavedDeck.id),
      { replace: true },
    );
  }, [explicitSavedDeckId, hash, matchedSavedDeck, mode, navigate]);

  useEffect(() => {
    if (!hash) {
      setDeck(null);
      setLoadError("Deck hash is missing.");
      return;
    }

    let cancelled = false;
    void decodeDeckHash(hash).then((decoded) => {
      if (cancelled) return;
      hydratedHashRef.current = hash;
      setCurrentHash(hash);
      setDeck(decoded);
      setLoadError(null);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setDeck(null);
      setLoadError(error instanceof Error ? error.message : "Could not decode deck hash.");
    });

    return () => {
      cancelled = true;
    };
  }, [hash]);

  const batchCardNumbers = useMemo(() => deck ? uniqueDeckCardNumbers(deck) : [], [deck]);
  const batchQuery = useCardsBatch(batchCardNumbers);
  const cardsByNumber = batchQuery.data?.data ?? {};
  const leaderColors = deck?.leader ? (cardsByNumber[deck.leader.card_number]?.color ?? []) : [];
  const deckColors = useMemo(() => {
    if (!deck) return [];

    const colors = new Set<string>();
    for (const entry of deck.main) {
      for (const color of cardsByNumber[entry.card_number]?.color ?? []) {
        colors.add(color);
      }
    }

    return [...colors];
  }, [cardsByNumber, deck]);
  const activeSearchColors = deck?.leader ? leaderColors : deckColors;
  const previewQuery = useCard(previewCard?.card_number ?? "", "en", Boolean(previewCard));

  const trimmedSearchQuery = debouncedSearchQuery.trim();
  const requiredLeaderColorQuery = !deck?.leader && deckColors.length > 0 ? `c>=${deckColors.join(",")}` : "";
  const effectiveSearchQuery = [requiredLeaderColorQuery, trimmedSearchQuery].filter(Boolean).join(" ");
  const baseSearchParams: Record<string, string> = mode === "edit" && deck && (trimmedSearchQuery.length > 0 || !deck.leader)
    ? {
        unique: "cards",
        limit: deck.leader ? "20" : "24",
        ...(!deck.leader ? { type: "Leader" } : {}),
        ...(deck.leader && activeSearchColors.length > 0 ? { color: activeSearchColors.join(",") } : {}),
        ...(effectiveSearchQuery ? { q: effectiveSearchQuery } : {}),
      }
    : {};
  const searchRequestKey = JSON.stringify(baseSearchParams);
  const searchEnabled = Object.keys(baseSearchParams).length > 0;
  const searchParams: Record<string, string> = Object.keys(baseSearchParams).length > 0
    ? {
        ...baseSearchParams,
        page: String(searchPage),
      }
    : {};
  const searchQueryResult = useCardSearch(searchParams);
  const searchResults = loadedSearchResults;
  const hasMoreSearchResults = searchQueryResult.data?.pagination?.has_more ?? false;

  useEffect(() => {
    setSearchPage(1);
    setLoadedSearchResults((current) => (current.length > 0 ? [] : current));
  }, [searchRequestKey]);

  useEffect(() => {
    const nextPageResults = (searchQueryResult.data?.data ?? []).filter((card) => {
      if (isDonCard(card)) return false;
      if (deck?.leader && card.card_type.toLowerCase() === "leader") return false;
      return true;
    });

    if (!searchQueryResult.data) {
      if (!searchEnabled) {
        setLoadedSearchResults((current) => (current.length > 0 ? [] : current));
      }
      return;
    }

    setLoadedSearchResults((current) => {
      if (searchPage <= 1) return nextPageResults;
      const byKey = new Map(current.map((card) => [`${card.card_number}:${card.language}`, card]));
      for (const card of nextPageResults) {
        byKey.set(`${card.card_number}:${card.language}`, card);
      }
      return [...byKey.values()];
    });
  }, [searchEnabled, Boolean(deck?.leader), searchPage, searchQueryResult.data]);

  const effectiveHash = currentHash ?? hash ?? hydratedHashRef.current ?? null;
  const isDirtySavedDeck = Boolean(mode === "edit" && savedDeckRecord && effectiveHash && savedDeckRecord.hash !== effectiveHash);
  const shouldWarnOnLeave = isDirtySavedDeck;
  const sharePath = effectiveHash ? deckHashToViewPath(effectiveHash) : null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = sharePath ? `${origin}${sharePath}` : "";
  const canSaveToLibrary = Boolean(mode === "edit" && deck && effectiveHash && (!savedDeckId || isDirtySavedDeck));
  const exportText = deck ? buildDeckExport(deck) : "";
  const totalMainCards = deck ? mainDeckCount(deck) : 0;
  const totalUniqueMain = deck ? uniqueMainCount(deck) : 0;
  const warnings = deck ? buildDeckWarnings(deck) : [];
  const previewDetail = previewQuery.data?.data ?? null;
  const leaderTitle = deck?.leader
    ? buildDeckTitle(deck.leader.card_number, cardsByNumber[deck.leader.card_number]?.name)
    : "Deck Builder";
  const deckStats = deck ? buildDeckStats(deck, cardsByNumber) : null;
  const deckTypeCounts = deck ? buildDeckTypeCounts(deck, cardsByNumber) : [];
  const deckCurveByType = deck ? buildDeckCurve(deck, cardsByNumber, "type") : [];
  const deckCurveByCounter = deck ? buildDeckCurve(deck, cardsByNumber, "counter") : [];
  const sortedMainDeckEntries = useMemo(
    () => deck ? sortDeckEntriesForDisplay(deck.main, cardsByNumber) : [],
    [cardsByNumber, deck],
  );

  useEffect(() => {
    if (!shouldWarnOnLeave || typeof window === "undefined") return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldWarnOnLeave]);

  useEffect(() => {
    if (!shouldWarnOnLeave || typeof window === "undefined" || typeof document === "undefined") return;

    let ignoreNextPopState = false;

    const confirmLeave = () => window.confirm("This saved deck has unsaved changes. Leave without saving?");

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      const isSameDocument = nextUrl.pathname === currentUrl.pathname
        && nextUrl.search === currentUrl.search
        && nextUrl.hash === currentUrl.hash;

      if (nextUrl.origin !== currentUrl.origin || isSameDocument) return;

      if (!confirmLeave()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handlePopState = () => {
      if (ignoreNextPopState) {
        ignoreNextPopState = false;
        return;
      }

      if (confirmLeave()) return;

      ignoreNextPopState = true;
      window.history.go(1);
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [shouldWarnOnLeave]);
  const parsedSearchQuery = useMemo(() => parseSearchQuery(searchQuery), [searchQuery]);
  const syntaxSearchTokens = parsedSearchQuery.syntaxTokens;
  const plainSearchText = parsedSearchQuery.plainText;

  usePageMeta({
    title: leaderTitle,
    description: mode === "edit"
      ? "Build and share One Piece Card Game decks in the URL."
      : "View a shared One Piece Card Game deck.",
    url: sharePath ?? "/decks/new",
  });

  if (loadError) {
    return (
      <div className={`${DEFAULT_PAGE_CONTAINER_CLASS} py-6 space-y-3`}>
        <ErrorState message={loadError} />
        <div className="text-sm text-text-secondary">
          <Link to="/decks" className="text-link hover:text-link-hover">Open deck library</Link>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className={`${DEFAULT_PAGE_CONTAINER_CLASS} py-6`}>
        <p className="text-text-secondary">Loading deck...</p>
      </div>
    );
  }

  const closePreview = () => {
    setPreviewCard(null);
  };

  const syncDeckUrl = (nextDeck: Deck) => {
    if (mode !== "edit") return;

    void encodeDeckHash(nextDeck).then((nextHash) => {
      if (nextHash === effectiveHash) return;
      hydratedHashRef.current = nextHash;
      setCurrentHash(nextHash);
      setSaveError(null);
      const nextPath = deckHashToEditPath(nextHash, savedDeckId);
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `${nextPath}${location.hash}`);
      }
    }).catch((error: unknown) => {
      setSaveError(error instanceof Error ? error.message : "Could not update deck URL.");
    });
  };

  const commitDeck = (nextDeck: Deck) => {
    setDeck(nextDeck);
    syncDeckUrl(nextDeck);
  };

  const updateDeck = (updater: (current: Deck) => Deck) => {
    setDeck((current) => {
      if (!current) return current;
      const nextDeck = updater(current);
      syncDeckUrl(nextDeck);
      return nextDeck;
    });
  };

  const clearDeck = () => {
    if (!deck) return;
    commitDeck({
      ...createEmptyDeck(),
      updated_at: Date.now(),
    });
  };

  const saveDeckToLibrary = () => {
    if (mode !== "edit" || !deck || !effectiveHash) return;

    if (savedDeckId) {
      upsertSavedDeckRecord(savedDeckId, effectiveHash, deck);
      setSavedDeckRevision((current) => current + 1);
      setSaveError(null);
      return;
    }

    const savedDeck = createSavedDeckRecord(effectiveHash, deck);
    setSavedDeckRevision((current) => current + 1);
    hydratedHashRef.current = effectiveHash;
    setCurrentHash(effectiveHash);
    setSaveError(null);
    navigate(deckHashToEditPath(effectiveHash, savedDeck.id), { replace: true });
  };

  const appendSyntaxFilter = (field: SyntaxField) => {
    const draft = syntaxDrafts[field];
    const trimmedValue = field === "counter"
      ? (draft.value.trim() || "0")
      : draft.value.trim();
    if (!trimmedValue) return;
    const token = `${field}${draft.operator}${trimmedValue}`;
    setSearchQuery(buildCombinedSearchQuery(plainSearchText, [...syntaxSearchTokens, token]));
    setSyntaxDrafts((current) => ({
      ...current,
      [field]: { ...current[field], value: "" },
    }));
  };

  const removeSearchToken = (targetToken: string) => {
    const nextTokens = [...syntaxSearchTokens];
    const targetIndex = nextTokens.indexOf(targetToken);
    if (targetIndex === -1) return;
    nextTokens.splice(targetIndex, 1);
    setSearchQuery(buildCombinedSearchQuery(plainSearchText, nextTokens));
  };

  const showCurveTooltip = (
    event: { currentTarget: EventTarget & Element },
    costLabel: string,
    seriesLabel: string,
    segmentLabel: string,
    count: number,
  ) => {
    const container = event.currentTarget.closest("[data-curve-chart]");
    if (!container) return;

    const segmentRect = event.currentTarget.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    setCurveTooltip({
      x: segmentRect.left - containerRect.left + (segmentRect.width / 2),
      y: segmentRect.top - containerRect.top,
      costLabel,
      seriesLabel,
      segmentLabel,
      count,
    });
  };

  const updateSyntaxDraft = (field: SyntaxField, next: Partial<SyntaxDraft>) => {
    setSyntaxDrafts((current) => ({
      ...current,
      [field]: { ...current[field], ...next },
    }));
  };

  const cycleSyntaxOperator = (field: SyntaxField) => {
    setSyntaxDrafts((current) => {
      const currentOperator = current[field].operator;
      const currentIndex = SYNTAX_OPERATORS.indexOf(currentOperator);
      const nextOperator = SYNTAX_OPERATORS[(currentIndex + 1) % SYNTAX_OPERATORS.length] ?? ">=";
      return {
        ...current,
        [field]: { ...current[field], operator: nextOperator },
      };
    });
  };

  const cycleCounterValue = () => {
    setSyntaxDrafts((current) => {
      const currentValue = current.counter.value;
      const currentIndex = COUNTER_VALUES.indexOf(currentValue as (typeof COUNTER_VALUES)[number]);
      const nextValue = COUNTER_VALUES[(currentIndex + 1) % COUNTER_VALUES.length] ?? "";
      return {
        ...current,
        counter: { ...current.counter, value: nextValue },
      };
    });
  };

  return (
    <div className={`${DEFAULT_PAGE_CONTAINER_CLASS} py-2 space-y-3`}>
      <section className="rounded-xl border border-border/70 bg-bg-card/75 p-2.5 sm:p-3">
        <div className="flex min-w-0 flex-col gap-2.5">
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">
                  {mode === "edit" ? "Deck Editor" : "Shared Deck"}
                </p>
                <h1 className="text-xl font-bold text-text-primary">
                  {leaderTitle}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                {canSaveToLibrary && (
                  <button
                    type="button"
                    onClick={saveDeckToLibrary}
                    className={DECK_HEADER_ACTION_CLASS}
                  >
                    <DeckSaveActionIcon />
                    Save
                  </button>
                )}
                {effectiveHash && (
                  mode === "edit" ? (
                    <a
                      href={deckHashToViewPath(effectiveHash, savedDeckId)}
                      className={`${DECK_HEADER_ACTION_CLASS} hover:no-underline`}
                    >
                      <DeckViewActionIcon />
                      View
                    </a>
                  ) : (
                    <Link
                      to={deckHashToEditPath(effectiveHash, savedDeckId)}
                      className={`${DECK_HEADER_ACTION_CLASS} bg-bg-tertiary/20 hover:no-underline`}
                    >
                      <DeckEditActionIcon />
                      Edit
                    </Link>
                  )
                )}
                {sharePath && (
                  <>
                    <div className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-bg-tertiary/20 px-2 py-1">
                      <span className="max-w-40 truncate text-[11px] text-text-secondary sm:max-w-56">{sharePath}</span>
                      <CopyButton value={shareUrl} label="Copy deck link" copiedLabel="Copied deck link" />
                    </div>
                  </>
                )}
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-tertiary/20 px-2 py-1 text-[11px] text-text-secondary">
                  <span className="font-medium text-text-primary">Decklist</span>
                  <CopyButton
                    value={exportText}
                    label="Copy decklist"
                    copiedLabel="Copied decklist"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {deckStats && (
                <>
                  <CompactStatusPill label="Avg Cost" value={deckStats.averageCost} />
                  <CompactStatusPill label="2ks" value={String(deckStats.twoKs)} />
                  <CompactStatusPill label="1ks" value={String(deckStats.oneKs)} />
                  <CompactStatusPill label="Bricks" value={String(deckStats.bricks)} />
                  <CompactStatusPill label="Triggers" value={String(deckStats.triggers)} />
                  <CompactStatusPill label="Chars" value={String(deckStats.characters)} />
                  <CompactStatusPill label="Events" value={String(deckStats.events)} />
                  <CompactStatusPill label="Stages" value={String(deckStats.stages)} />
                </>
              )}
              {batchQuery.data && batchQuery.data.missing.length > 0 && (
                <span className="text-text-muted">Missing: {batchQuery.data.missing.join(", ")}</span>
              )}
            </div>

            {(deckCurveByType.length > 0 || deckCurveByCounter.length > 0) && (
              <div className="border border-border/55 bg-bg-tertiary/10 px-2 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[16px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                    Charts
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurveOpen((current) => !current)}
                      className="inline-flex h-4 min-w-[32px] items-center justify-center border border-border/70 bg-bg-tertiary/16 px-1 text-[6px] font-medium uppercase leading-none tracking-[0.02em] text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
                      aria-expanded={curveOpen}
                    >
                      {curveOpen ? "hide" : "show"}
                    </button>
                    <div className="inline-flex items-center border border-border/70 bg-bg-tertiary/16 p-[2px] lg:hidden">
                      {([
                        ["curve", "cost"],
                        ["counter", "counter"],
                        ["types", "types"],
                      ] as const).map(([mode, label]) => (
                        <button
                        key={mode}
                        type="button"
                        onClick={() => setDeckChartMode(mode)}
                        className={`inline-flex h-3.5 items-center px-1 text-[6px] font-medium uppercase tracking-[0.02em] transition ${
                          deckChartMode === mode
                            ? "bg-bg-card text-text-primary"
                            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                        }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {curveOpen && (
                  <div className="mt-2">
                    <div className="lg:hidden">
                      {deckChartMode === "curve" ? (
                        <CombinedCostCurveChart
                          typeCurve={deckCurveByType}
                          counterCurve={deckCurveByCounter}
                          curveTooltip={curveTooltip}
                          onClearTooltip={() => setCurveTooltip(null)}
                          onShowTooltip={showCurveTooltip}
                        />
                      ) : deckChartMode === "counter" ? (
                        <CounterBarChart
                          bricks={deckStats?.bricks ?? 0}
                          oneKs={deckStats?.oneKs ?? 0}
                          twoKs={deckStats?.twoKs ?? 0}
                        />
                      ) : (
                        <TypePieChart counts={deckTypeCounts} />
                      )}
                    </div>
                    <div className="hidden gap-2 lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.8fr)_minmax(0,1fr)]">
                      <div className="border border-border/55 bg-bg-card/35 px-2 py-2">
                        <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">Cost</div>
                        <CombinedCostCurveChart
                          typeCurve={deckCurveByType}
                          counterCurve={deckCurveByCounter}
                          curveTooltip={curveTooltip}
                          onClearTooltip={() => setCurveTooltip(null)}
                          onShowTooltip={showCurveTooltip}
                        />
                      </div>
                      <div className="border border-border/55 bg-bg-card/35 px-2 py-2">
                        <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">Counter</div>
                        <CounterBarChart
                          bricks={deckStats?.bricks ?? 0}
                          oneKs={deckStats?.oneKs ?? 0}
                          twoKs={deckStats?.twoKs ?? 0}
                        />
                      </div>
                      <div className="border border-border/55 bg-bg-card/35 px-2 py-2">
                        <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">Types</div>
                        <TypePieChart counts={deckTypeCounts} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {warnings.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {warnings.map((warning) => (
                  <p key={warning} className="rounded-lg border border-banned/25 bg-banned/8 px-2.5 py-1.5 text-[11px] text-[#f2b0b0]">
                    {warning}
                  </p>
                ))}
              </div>
            )}

            {mode === "edit" && (
              <div className="relative mt-auto pt-2">
                <div className="flex flex-col gap-2">
                  <div
                    className="flex min-h-10 min-w-0 flex-1 flex-wrap items-center gap-1 rounded-lg border border-border bg-bg-input px-2 py-1 transition-colors focus-within:border-accent/70"
                    onClick={() => searchInputRef.current?.focus()}
                  >
                    {syntaxSearchTokens.map((token, index) => (
                      <button
                        key={`${token}-${index}`}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeSearchToken(token);
                        }}
                        className="inline-flex items-center gap-1 border border-border/60 bg-bg-tertiary/18 px-2 py-1 text-[10px] text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
                        aria-label={`Remove search term ${token}`}
                      >
                        <span>{token}</span>
                        <span className="text-[11px] leading-none text-text-muted">x</span>
                      </button>
                    ))}
                    <input
                      ref={searchInputRef}
                      value={plainSearchText}
                      onChange={(event) => setSearchQuery(buildCombinedSearchQuery(event.target.value, syntaxSearchTokens))}
                      placeholder={!deck.leader ? "Search leaders..." : "Search cards..."}
                      className="min-w-0 flex-1 bg-transparent py-1 text-sm text-text-primary outline-none placeholder:text-text-muted"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSyntaxHelperOpen((current) => !current)}
                      aria-label="Toggle syntax helper"
                      className={`inline-flex items-center justify-center border px-1.5 py-0.5 text-[9px] font-medium uppercase leading-none tracking-[0.04em] transition sm:h-5 sm:min-w-[56px] sm:border-border/55 sm:bg-bg-input/75 sm:px-2 sm:py-0 sm:text-[9px] sm:tracking-[0.06em] ${syntaxHelperOpen
                        ? "border-accent/50 bg-accent/12 text-text-primary sm:border-accent/55 sm:bg-accent/14"
                        : "border-border bg-bg-tertiary/20 text-text-secondary hover:bg-bg-hover hover:text-text-primary sm:border-border/55 sm:bg-bg-input/75"}`}
                    >
                      syntax
                    </button>
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      aria-label="Clear search"
                      className="inline-flex items-center justify-center border border-border bg-bg-tertiary/20 px-1.5 py-0.5 text-[9px] font-medium uppercase leading-none tracking-[0.04em] text-text-secondary transition hover:bg-bg-hover hover:text-text-primary sm:h-5 sm:min-w-[40px] sm:border-border/55 sm:bg-bg-input/75 sm:px-2 sm:py-0 sm:text-[9px] sm:tracking-[0.06em]"
                    >
                      clear
                    </button>
                  </div>
                </div>
                {syntaxHelperOpen && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 border border-border/70 bg-bg-card/96 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.32)] backdrop-blur">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(["cost", "power", "counter"] as SyntaxField[]).map((field) => {
                        const draft = syntaxDrafts[field];
                        return (
                          <div key={field} className="flex items-center gap-1 border border-border/60 bg-bg-tertiary/10 px-1 py-1">
                            <span className="min-w-0 text-[9px] font-medium uppercase tracking-[0.06em] text-text-secondary">
                              {field}
                            </span>
                            <button
                              type="button"
                              onClick={() => cycleSyntaxOperator(field)}
                              className="flex h-5 w-9 items-center justify-center border border-border/55 bg-bg-input/75 px-1 text-[9px] font-semibold tabular-nums text-text-primary transition hover:bg-bg-hover"
                              aria-label={`Cycle ${field} operator`}
                            >
                              {draft.operator}
                            </button>
                            {field === "counter" ? (
                              <button
                                type="button"
                                onClick={cycleCounterValue}
                                className="flex h-5 w-12 items-center justify-center border border-border/55 bg-bg-input/75 px-1 text-[8px] font-medium tabular-nums text-text-primary transition hover:bg-bg-hover"
                                aria-label="Cycle counter value"
                              >
                                {draft.value || "-"}
                              </button>
                            ) : (
                              <input
                                value={draft.value}
                                onChange={(event) => updateSyntaxDraft(field, { value: event.target.value.replace(/[^\d]/g, "") })}
                                inputMode="numeric"
                                placeholder="#"
                                className="h-5 w-14 border border-border/55 bg-bg-input/75 px-1.5 text-[8px] font-medium text-text-primary outline-none placeholder:text-text-muted"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => appendSyntaxFilter(field)}
                              disabled={field !== "counter" && draft.value.trim().length === 0}
                              className="flex h-5 w-5 items-center justify-center border border-border/55 bg-bg-input/75 text-[10px] font-semibold text-text-primary transition hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label={`Add ${field} syntax filter`}
                            >
                              +
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {searchQueryResult.error && (
                  <p className="mt-2 text-sm text-banned">{(searchQueryResult.error as Error).message}</p>
                )}
              </div>
            )}
          </div>
        {saveError && (
          <p className="mt-2 text-xs text-banned">{saveError}</p>
        )}
      </section>

      <div className={`grid gap-3 ${mode === "edit" ? "xl:grid-cols-[minmax(0,2fr)_300px]" : "lg:grid-cols-[minmax(0,2fr)_300px]"}`}>
        <section className="rounded-xl border border-border/70 bg-bg-card/70 p-2.5 sm:p-3">
          {mode === "edit" ? (
            <div className="space-y-2">
              {trimmedSearchQuery.length === 0 && deck.leader && (
                <p className="rounded-xl border border-dashed border-border/70 bg-bg-tertiary/10 px-3 py-6 text-center text-xs text-text-secondary">
                  Search to add cards in your leader's color identity.
                </p>
              )}
              {searchQueryResult.isLoading && (trimmedSearchQuery.length > 0 || !deck.leader) && (
                <p className="text-sm text-text-secondary">Searching...</p>
              )}
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
                    {searchResults.map((card) => (
                      <SearchResultTile
                        key={`${card.card_number}-${card.language}`}
                        card={card}
                        deck={deck}
                        onAdd={() => updateDeck((current) => addCardToDeck(current, card))}
                        onSubtract={() => updateDeck((current) => {
                          if (card.card_type.toLowerCase() === "leader") {
                            return current.leader?.card_number === card.card_number ? removeLeader(current) : current;
                          }

                          const existing = current.main.find((entry) => entry.card_number === card.card_number);
                          return updateMainDeckCount(current, card.card_number, (existing?.count ?? 0) - 1);
                        })}
                        onPreview={() => setPreviewCard(card)}
                      />
                    ))}
                  </div>
                  {hasMoreSearchResults && (
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() => setSearchPage((current) => current + 1)}
                        disabled={searchQueryResult.isFetching}
                        className="border border-border/60 bg-bg-tertiary/14 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary transition hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {searchQueryResult.isFetching ? "Loading..." : "Load more"}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!searchQueryResult.isLoading && (trimmedSearchQuery.length > 0 || !deck.leader) && searchResults.length === 0 && (
                <p className="text-sm text-text-secondary">No cards matched that search.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {deck.leader && (
                <div>
                  <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">Leader</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
                    <ReadOnlyDeckTile
                      entry={{ ...deck.leader, count: 1 }}
                      card={cardsByNumber[deck.leader.card_number]}
                      onPreview={() => setPreviewCard(cardsByNumber[deck.leader!.card_number] ?? null)}
                    />
                  </div>
                </div>
              )}
              <div>
                <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">Main Deck</div>
                {deck.main.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4">
                    {sortedDeckEntries(deck).map((entry) => (
                      <ReadOnlyDeckTile
                        key={entry.card_number}
                        entry={entry}
                        card={cardsByNumber[entry.card_number]}
                        onPreview={() => setPreviewCard(cardsByNumber[entry.card_number] ?? null)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border/70 bg-bg-tertiary/10 px-3 py-6 text-center text-xs text-text-secondary">
                    No cards in this deck.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {(mode === "edit" || mode === "view") && (
          <section className="space-y-3">
            <section className="overflow-hidden rounded-t-xl rounded-b-none border border-border/70 bg-bg-card/70 pt-2.5 sm:pt-3">
              <div className="mb-3 space-y-2 px-2.5 sm:px-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-text-primary">Deck</h2>
                  {mode === "edit" && (
                    <HoverLabelIconButton label="Clear deck" onClick={clearDeck} tone="danger">
                      <TrashIcon />
                    </HoverLabelIconButton>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-text-secondary sm:text-xs">
                    {totalMainCards}/50 cards - {totalUniqueMain} unique
                  </p>
                </div>
              </div>

              {deck.leader ? (
                <DeckEntryRow
                  entry={{ ...deck.leader, count: 1 }}
                  card={cardsByNumber[deck.leader.card_number]}
                  readOnly={mode === "view"}
                  onPreview={() => setPreviewCard(cardsByNumber[deck.leader!.card_number] ?? null)}
                  onRemove={mode === "edit" ? () => updateDeck((current) => removeLeader(current)) : undefined}
                  forceStaticCount
                />
              ) : (
                <div className="mb-3 px-2.5 text-[11px] text-text-muted sm:px-3">Leader will stay pinned here once selected.</div>
              )}

              {deck.main.length === 0 ? (
                <p className="mx-2.5 rounded-lg border border-dashed border-border/70 bg-bg-tertiary/10 px-3 py-4 text-center text-xs text-text-secondary sm:mx-3">
                  No main-deck cards selected yet.
                </p>
              ) : (
                <div>
                  {sortedMainDeckEntries.map((entry) => (
                    <DeckEntryRow
                      key={entry.card_number}
                      entry={entry}
                      card={cardsByNumber[entry.card_number]}
                      readOnly={mode === "view"}
                      onPreview={() => setPreviewCard(cardsByNumber[entry.card_number] ?? null)}
                      onDecrease={mode === "edit" ? () => updateDeck((current) => {
                        const existing = current.main.find((row) => row.card_number === entry.card_number);
                        return updateMainDeckCount(current, entry.card_number, (existing?.count ?? 0) - 1);
                      }) : undefined}
                      onIncrease={mode === "edit" ? () => updateDeck((current) => {
                        const existing = current.main.find((row) => row.card_number === entry.card_number);
                        return updateMainDeckCount(current, entry.card_number, (existing?.count ?? 0) + 1);
                      }) : undefined}
                      onRemove={mode === "edit" ? () => updateDeck((current) => updateMainDeckCount(current, entry.card_number, 0)) : undefined}
                    />
                  ))}
                </div>
              )}
            </section>
          </section>
        )}

      </div>

      {previewCard && (
        <CardPreviewModal
          card={previewCard}
          detail={previewDetail}
          isLoading={previewQuery.isLoading}
          loadError={previewQuery.error instanceof Error ? previewQuery.error.message : null}
          onClose={closePreview}
        />
      )}
    </div>
  );
}

function SearchResultTile({
  card,
  deck,
  onAdd,
  onSubtract,
  onPreview,
}: {
  card: Card;
  deck: Deck;
  onAdd: () => void;
  onSubtract: () => void;
  onPreview: () => void;
}) {
  const thumbnailUrl = card.thumbnail_url ?? card.image_url;
  const isLeader = card.card_type.toLowerCase() === "leader";
  const mainEntry = deck.main.find((entry) => entry.card_number === card.card_number);
  const currentCount = isLeader
    ? (deck.leader?.card_number === card.card_number ? 1 : 0)
    : (mainEntry?.count ?? 0);
  const isMaxed = !isLeader && currentCount >= 4;

  return (
    <div className="group relative">
      <div
        role="button"
        tabIndex={isMaxed ? -1 : 0}
        aria-disabled={isMaxed}
        onClick={onAdd}
        onContextMenu={(event) => {
          event.preventDefault();
          if (currentCount === 0) return;
          onSubtract();
        }}
        onKeyDown={(event) => {
          if (isMaxed) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onAdd();
          }
        }}
        className={`block w-full text-left ${isMaxed ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <div className="overflow-hidden rounded-xl border border-border/70 bg-bg-secondary/60 transition-colors group-hover:border-accent/60 group-hover:bg-bg-hover/70">
          <div className="relative bg-bg-tertiary">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={card.name} className="block w-full" loading="lazy" />
            ) : (
              <div className="aspect-[63/88] flex items-center justify-center px-2 text-center text-[11px] text-text-muted">
                {card.card_number}
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end bg-gradient-to-t from-black/85 via-black/25 to-transparent p-2.5">
              {currentCount > 0 && (
                <span className="rounded-md border border-white/20 bg-accent px-2.5 py-1.5 text-[16px] font-black leading-none text-bg-primary shadow-[0_6px_16px_rgba(0,0,0,0.4)]">
                  {isLeader ? "SET" : `x${currentCount}`}
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1.5 p-2.5">
            <div className="flex items-center gap-1.5">
              <p className="min-w-0 truncate text-[13px] font-semibold leading-tight text-text-primary">
                {card.name}
              </p>
              <span className="inline-flex shrink-0 items-center rounded-full border border-border/70 bg-bg-tertiary/45 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                {card.card_number}
              </span>
            </div>
            <p className="truncate text-[10px] text-text-secondary">
              {card.card_type}
              {card.cost != null ? ` - Cost ${card.cost}` : ""}
              {card.color.length > 0 ? ` - ${card.color.join("/")}` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="absolute left-2 top-2">
        <SearchTileActionButton label={`Preview ${card.name}`} onClick={onPreview}>
          <MagnifierIcon />
        </SearchTileActionButton>
      </div>

      {!isLeader && (
        <div className="absolute right-2 top-2 flex flex-col gap-1.5">
          <SearchTileActionButton label={`Add ${card.name}`} onClick={onAdd} disabled={isMaxed}>
            +
          </SearchTileActionButton>
          <SearchTileActionButton label={`Remove ${card.name}`} onClick={onSubtract} disabled={currentCount === 0}>
            -
          </SearchTileActionButton>
        </div>
      )}
    </div>
  );
}

function ReadOnlyDeckTile({
  entry,
  card,
  onPreview,
}: {
  entry: DeckEntry;
  card?: CardDetail;
  onPreview: () => void;
}) {
  const thumbnailUrl = getPreferredDeckImage(card);

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onPreview}
        className="block w-full text-left"
      >
        <div className="overflow-hidden rounded-xl border border-border/70 bg-bg-secondary/60 transition-colors group-hover:border-accent/60 group-hover:bg-bg-hover/70">
          <div className="relative bg-bg-tertiary">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={card?.name ?? entry.card_number} className="block w-full" loading="lazy" />
            ) : (
              <div className="aspect-[63/88] flex items-center justify-center px-2 text-center text-[11px] text-text-muted">
                {entry.card_number}
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end bg-gradient-to-t from-black/85 via-black/25 to-transparent p-2.5">
              <span className="rounded-md border border-white/20 bg-accent px-2.5 py-1.5 text-[16px] font-black leading-none text-bg-primary shadow-[0_6px_16px_rgba(0,0,0,0.4)]">
                x{entry.count}
              </span>
            </div>
          </div>
          <div className="space-y-1.5 p-2.5">
            <div className="flex items-center gap-1.5">
              <p className="min-w-0 truncate text-[13px] font-semibold leading-tight text-text-primary">
                {card?.name ?? entry.card_number}
              </p>
              <span className="inline-flex shrink-0 items-center rounded-full border border-border/70 bg-bg-tertiary/45 px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                {entry.card_number}
              </span>
            </div>
            <p className="truncate text-[10px] text-text-secondary">
              {card?.card_type ?? "Unknown"}
              {card?.cost != null ? ` - Cost ${card.cost}` : ""}
              {(card?.color?.length ?? 0) > 0 ? ` - ${card!.color.join("/")}` : ""}
            </p>
          </div>
        </div>
      </button>

      <div className="absolute left-2 top-2">
        <SearchTileActionButton label={`Preview ${card?.name ?? entry.card_number}`} onClick={onPreview}>
          <MagnifierIcon />
        </SearchTileActionButton>
      </div>
    </div>
  );
}

function ChartTooltip({
  children,
  style,
}: {
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[88px] border border-border/70 bg-bg-primary/96 px-2.5 py-1 text-[10px] text-text-primary shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
      style={style}
    >
      {children}
    </div>
  );
}

function CombinedCostCurveChart({
  typeCurve,
  counterCurve,
  curveTooltip,
  onClearTooltip,
  onShowTooltip,
}: {
  typeCurve: DeckCurveBin[];
  counterCurve: DeckCurveBin[];
  curveTooltip: {
    x: number;
    y: number;
    costLabel: string;
    seriesLabel: string;
    segmentLabel: string;
    count: number;
  } | null;
  onClearTooltip: () => void;
  onShowTooltip: (event: { currentTarget: EventTarget & Element }, costLabel: string, seriesLabel: string, segmentLabel: string, count: number) => void;
}) {
  if (typeCurve.length === 0 && counterCurve.length === 0) return null;

  const bins = typeCurve.map((typeBin, index) => ({
    label: typeBin.label,
    count: typeBin.count,
    typeSegments: typeBin.segments,
    counterSegments: counterCurve[index]?.segments ?? [],
    typeHeight: typeBin.height,
    counterHeight: counterCurve[index]?.height ?? 0,
  }));

  return (
    <div className="space-y-1.5">
      <div className="h-[22px] overflow-hidden">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1 text-[9px] text-text-secondary">
          <div className="inline-flex flex-wrap items-center gap-1">
            <span className="font-medium uppercase tracking-[0.08em] text-text-muted">type</span>
            {typeCurve[0]?.segments.map((segment) => (
              <span key={segment.key} className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 ${segment.colorClass}`} />
                <span>{segment.label.toLowerCase()}</span>
              </span>
            ))}
          </div>
          <div className="inline-flex flex-wrap items-center gap-1">
            <span className="font-medium uppercase tracking-[0.08em] text-text-muted">counter</span>
            {counterCurve[0]?.segments.map((segment) => (
              <span key={segment.key} className="inline-flex items-center gap-1">
                <span className={`h-2 w-2 ${segment.colorClass}`} />
                <span>{segment.label.toLowerCase()}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <div
        data-curve-chart
        className="relative"
        onMouseLeave={onClearTooltip}
      >
        {curveTooltip && (
          <ChartTooltip
            style={{
              left: curveTooltip.x,
              top: Math.max(0, curveTooltip.y - 36),
              transform: "translateX(-50%)",
            }}
          >
            {curveTooltip.costLabel} cost {curveTooltip.seriesLabel.toLowerCase()} {curveTooltip.segmentLabel.toLowerCase()}: {curveTooltip.count}
          </ChartTooltip>
        )}
        <div className="grid grid-cols-11 gap-2">
          {bins.map(({ label, count, typeSegments, counterSegments, typeHeight, counterHeight }) => (
            <div key={label} className="grid min-w-0 grid-rows-[12px_84px_12px] items-end gap-1">
              <span className="text-center text-[9px] font-semibold leading-none text-text-primary">
                {count > 0 ? count : ""}
              </span>
              <div
                className="mx-auto grid h-[84px] w-[78%] grid-cols-2 gap-px overflow-hidden border border-border/40 bg-border/40"
                title={`${label} cost: ${count}`}
              >
                <div className="flex min-w-0 items-end bg-transparent">
                  <div
                    className="w-full"
                    style={{ height: `${typeHeight}%`, minHeight: count > 0 ? "4px" : "0px" }}
                  >
                    <div className="flex h-full flex-col-reverse">
                      {typeSegments
                        .filter((segment) => segment.count > 0)
                        .map((segment) => (
                          <button
                            key={segment.key}
                            type="button"
                            onMouseEnter={(event) => onShowTooltip(event, label, "type", segment.label, segment.count)}
                            onFocus={(event) => onShowTooltip(event, label, "type", segment.label, segment.count)}
                            onClick={(event) => onShowTooltip(event, label, "type", segment.label, segment.count)}
                            className={`block w-full ${segment.colorClass}`}
                            style={{ height: `${segment.percentOfBin}%` }}
                            title={`${label} cost type ${segment.label}: ${segment.count}`}
                            aria-label={`${label} cost type ${segment.label}: ${segment.count}`}
                          />
                        ))}
                    </div>
                  </div>
                </div>
                <div className="flex min-w-0 items-end bg-transparent">
                  <div
                    className="w-full"
                    style={{ height: `${counterHeight}%`, minHeight: count > 0 ? "4px" : "0px" }}
                  >
                    <div className="flex h-full flex-col-reverse">
                      {counterSegments
                        .filter((segment) => segment.count > 0)
                        .map((segment) => (
                          <button
                            key={segment.key}
                            type="button"
                            onMouseEnter={(event) => onShowTooltip(event, label, "counter", segment.label, segment.count)}
                            onFocus={(event) => onShowTooltip(event, label, "counter", segment.label, segment.count)}
                            onClick={(event) => onShowTooltip(event, label, "counter", segment.label, segment.count)}
                            className={`block w-full ${segment.colorClass}`}
                            style={{ height: `${segment.percentOfBin}%` }}
                            title={`${label} cost counter ${segment.label}: ${segment.count}`}
                            aria-label={`${label} cost counter ${segment.label}: ${segment.count}`}
                          />
                        ))}
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-center text-[9px] uppercase tracking-[0.04em] text-text-secondary">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CounterBarChart({
  bricks,
  oneKs,
  twoKs,
}: {
  bricks: number;
  oneKs: number;
  twoKs: number;
}) {
  const bars = [
    { label: "0", count: bricks, colorClass: "bg-slate-400/85" },
    { label: "1k", count: oneKs, colorClass: "bg-sky-400/85" },
    { label: "2k", count: twoKs, colorClass: "bg-amber-300/90" },
  ];
  const maxCount = Math.max(1, ...bars.map((bar) => bar.count));
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    count: number;
  } | null>(null);

  return (
    <div className="space-y-1.5">
      <div aria-hidden="true" className="h-[22px]" />
      <div
        className="relative"
        onMouseLeave={() => setTooltip(null)}
      >
        {tooltip && (
          <ChartTooltip
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, calc(-100% - 6px))",
            }}
          >
            {tooltip.label.toLowerCase()} counter: {tooltip.count}
          </ChartTooltip>
        )}
      <div className="grid grid-cols-3 gap-2">
        {bars.map((bar) => (
          <div key={bar.label} className="grid min-w-0 grid-rows-[12px_84px_12px] items-end gap-1">
            <span className="text-center text-[9px] font-semibold leading-none text-text-primary">
              {bar.count > 0 ? bar.count : ""}
            </span>
            <div className="flex h-[84px] items-end justify-center">
              <div
                className="flex h-full w-[78%] cursor-pointer items-end overflow-hidden border border-border/40 bg-border/40"
                title={`${bar.label} counter: ${bar.count}`}
                onMouseEnter={(event) => {
                  const rect = event.currentTarget.parentElement?.parentElement?.parentElement?.getBoundingClientRect();
                  const currentRect = event.currentTarget.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({
                    x: currentRect.left - rect.left + (currentRect.width / 2),
                    y: currentRect.top - rect.top,
                    label: bar.label,
                    count: bar.count,
                  });
                }}
                onMouseMove={(event) => {
                  const rect = event.currentTarget.parentElement?.parentElement?.parentElement?.getBoundingClientRect();
                  const currentRect = event.currentTarget.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({
                    x: currentRect.left - rect.left + (currentRect.width / 2),
                    y: currentRect.top - rect.top,
                    label: bar.label,
                    count: bar.count,
                  });
                }}
                onClick={(event) => {
                  const rect = event.currentTarget.parentElement?.parentElement?.parentElement?.getBoundingClientRect();
                  const currentRect = event.currentTarget.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({
                    x: currentRect.left - rect.left + (currentRect.width / 2),
                    y: currentRect.top - rect.top,
                    label: bar.label,
                    count: bar.count,
                  });
                }}
              >
                <div
                  className="flex h-full w-full items-end bg-transparent"
                >
                  <div
                    className={`w-full ${bar.colorClass}`}
                    style={{ height: `${Math.max(4, Math.round((bar.count / maxCount) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
            <span className="text-center text-[9px] uppercase tracking-[0.04em] text-text-secondary">
              {bar.label}
            </span>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

function TypePieChart({
  counts,
}: {
  counts: Array<{ type: string; count: number }>;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    count: number;
  } | null>(null);
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  if (total <= 0) return null;

  const palette = [
    { color: "rgba(52, 211, 153, 0.9)", dotClass: "bg-emerald-400/90" },
    { color: "rgba(232, 121, 249, 0.9)", dotClass: "bg-fuchsia-400/90" },
    { color: "rgba(103, 232, 249, 0.9)", dotClass: "bg-cyan-300/90" },
    { color: "rgba(252, 211, 77, 0.9)", dotClass: "bg-amber-300/90" },
    { color: "rgba(251, 113, 133, 0.9)", dotClass: "bg-rose-400/90" },
    { color: "rgba(167, 139, 250, 0.9)", dotClass: "bg-violet-400/90" },
    { color: "rgba(56, 189, 248, 0.9)", dotClass: "bg-sky-400/90" },
    { color: "rgba(190, 242, 100, 0.9)", dotClass: "bg-lime-300/90" },
  ];

  let cumulative = 0;
  const slices = counts.map((item, index) => {
    const start = cumulative / total;
    cumulative += item.count;
    const end = cumulative / total;
    return {
      ...item,
      ...(palette[index % palette.length] ?? { color: "rgba(203, 213, 225, 0.9)", dotClass: "bg-slate-300/90" }),
      offset: start,
      size: end - start,
    };
  });

  const gradient = `conic-gradient(${slices.map((slice) => {
    const start = slice.offset * 360;
    const end = (slice.offset + slice.size) * 360;
    return `${slice.color} ${start}deg ${end}deg`;
  }).join(", ")})`;

  return (
    <div className="grid gap-3 sm:grid-cols-[104px_minmax(0,1fr)] sm:items-center">
      <div
        className="relative mx-auto h-[104px] w-[104px]"
        onMouseLeave={() => setTooltip(null)}
      >
        {tooltip && (
          <ChartTooltip
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, calc(-100% - 6px))",
            }}
          >
            {tooltip.label.toLowerCase()}: {tooltip.count}
          </ChartTooltip>
        )}
        <div
          className="h-full w-full rounded-full border border-border/50"
          style={{ background: gradient }}
        />
        <svg viewBox="0 0 104 104" className="absolute inset-0 h-full w-full overflow-visible">
          {slices.map((slice) => {
            const startAngle = (slice.offset * 360) - 90;
            const endAngle = ((slice.offset + slice.size) * 360) - 90;
            return (
              <path
                key={slice.type}
                d={describePieSlice(52, 52, 44, startAngle, endAngle)}
                fill="transparent"
                onMouseEnter={(event) => {
                  const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                    label: slice.type,
                    count: slice.count,
                  });
                }}
                onMouseMove={(event) => {
                  const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                    label: slice.type,
                    count: slice.count,
                  });
                }}
                onClick={(event) => {
                  const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                    label: slice.type,
                    count: slice.count,
                  });
                }}
                onFocus={(event) => {
                  const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({
                    x: event.currentTarget.getBBox().x + (event.currentTarget.getBBox().width / 2),
                    y: event.currentTarget.getBBox().y,
                    label: slice.type,
                    count: slice.count,
                  });
                }}
                className="cursor-pointer"
              />
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {slices.map((slice) => (
          <span
            key={slice.type}
            className="inline-flex items-center gap-1 border border-border/60 bg-bg-tertiary/14 px-2 py-1 text-[10px] text-text-secondary"
            title={`${slice.type}: ${slice.count}`}
          >
            <span className={`h-2 w-2 ${slice.dotClass}`} />
            <span className="truncate">{slice.type}</span>
            <span className="font-semibold text-text-primary">{slice.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians)),
  };
}

function describePieSlice(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(centerX, centerY, radius, startAngle);
  const end = polarToCartesian(centerX, centerY, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function SearchTileActionButton({
  children,
  label,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const lastActivationRef = useRef(0);

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const now = Date.now();
        if (now - lastActivationRef.current < 120) return;
        lastActivationRef.current = now;
        onClick();
      }}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/78 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur transition hover:bg-black/92 disabled:cursor-not-allowed disabled:border-white/12 disabled:bg-black/58 disabled:text-white/75 disabled:opacity-100"
    >
      {children}
    </button>
  );
}

function MagnifierIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

function CardPreviewModal({
  card,
  detail,
  isLoading,
  loadError,
  onClose,
}: {
  card: Card;
  detail: CardDetail | null;
  isLoading: boolean;
  loadError: string | null;
  onClose: () => void;
}) {
  const imageUrl = detail?.variants[0]?.media.image_url
    ?? detail?.variants[0]?.media.scan_url
    ?? detail?.variants[0]?.media.thumbnail_url
    ?? detail?.variants[0]?.media.scan_thumbnail_url
    ?? card.image_url
    ?? card.thumbnail_url
    ?? null;
  const stats = [
    detail?.cost != null ? `${detail.cost} Cost` : card.cost != null ? `${card.cost} Cost` : null,
    detail?.life != null ? `${detail.life} Life` : card.life != null ? `${card.life} Life` : null,
    detail?.power != null ? `${detail.power} Power` : card.power != null ? `${card.power} Power` : null,
    (detail?.attribute?.length ?? 0) > 0 ? detail!.attribute!.join(" / ") : (card.attribute?.length ?? 0) > 0 ? card.attribute!.join(" / ") : null,
    detail?.counter != null ? `Counter +${detail.counter}` : card.counter != null ? `Counter +${card.counter}` : null,
  ].filter(Boolean) as string[];
  const types = detail?.types ?? card.types;
  const effect = detail?.effect ?? card.effect;
  const trigger = detail?.trigger ?? card.trigger;
  const rarity = detail?.rarity ?? card.rarity;
  const color = detail?.color ?? card.color;
  const cardType = detail?.card_type ?? card.card_type;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-3 sm:p-6" onClick={onClose}>
      <div
        className="relative max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-border/80 bg-[#111318] shadow-[0_32px_120px_rgba(0,0,0,0.55)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-lg text-white transition hover:scale-105 hover:border-white/35 hover:bg-black/88 hover:text-white"
        >
          ×
        </button>

        <div className="grid max-h-[92vh] overflow-y-auto lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <div className="border-b border-border/70 bg-[#0d1015] p-4 lg:border-b-0 lg:border-r">
            <div className="overflow-hidden rounded-2xl border border-border/70 bg-black/30">
              {imageUrl ? (
                <img src={imageUrl} alt={detail?.name ?? card.name} className="block w-full" />
              ) : (
                <div className="aspect-[63/88] flex items-center justify-center px-6 text-center text-sm text-text-muted">
                  No image available
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="space-y-2 border-b border-border/70 pb-4">
              <div className="flex items-start gap-3 pr-12">
                <Link
                  to={`/cards/${detail?.card_number ?? card.card_number}`}
                  className="min-w-0 text-2xl font-bold text-text-primary hover:text-link-hover hover:no-underline"
                >
                  <span className="block truncate">{detail?.name ?? card.name}</span>
                </Link>
                <div className="ml-auto inline-flex shrink-0 items-center gap-1.5">
                  <CopyButton
                    value={detail?.card_number ?? card.card_number}
                    label="Copy card number"
                    copiedLabel="Card number copied"
                  />
                  <span className="text-sm text-text-secondary">{detail?.card_number ?? card.card_number}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
                {rarity && rarity !== "L" && <span>{rarity}</span>}
                {rarity && rarity !== "L" && <InlineDot />}
                <span>{color.join(" / ")}</span>
                <InlineDot />
                <span>{cardType}</span>
                {detail?.block && (
                  <>
                    <InlineDot />
                    <span>Block {detail.block}</span>
                  </>
                )}
              </div>
            </div>

            {stats.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-primary">
                {stats.map((stat, index) => (
                  <div key={stat} className="inline-flex items-center gap-x-2">
                    {index > 0 && <InlineDot />}
                    <span>{stat}</span>
                  </div>
                ))}
              </div>
            )}

            {types.length > 0 && (
              <section className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Types</p>
                <p className="text-sm text-text-primary">{types.join(" / ")}</p>
              </section>
            )}

            {(effect || trigger) && (
              <section className="space-y-3 rounded-2xl border border-border/70 bg-bg-card/60 p-4">
                {effect ? <CardRulesText text={effect} /> : null}
                {trigger ? <TriggerBlock className={effect ? "mt-1" : ""} text={trigger} /> : null}
              </section>
            )}

            {isLoading && <p className="text-sm text-text-secondary">Loading full card data...</p>}
            {loadError && <p className="text-sm text-banned">{loadError}</p>}

            <div className="border-t border-border/70 pt-3">
              <Link
                to={`/cards/${detail?.card_number ?? card.card_number}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-link underline-offset-2 hover:text-link-hover hover:underline"
              >
                Open full card page
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InlineDot() {
  return <span className="text-text-muted">•</span>;
}

function DeckEntryRow({
  entry,
  card,
  readOnly,
  onPreview,
  onDecrease,
  onIncrease,
  onRemove,
  forceStaticCount = false,
}: {
  entry: DeckEntry;
  card?: CardDetail;
  readOnly: boolean;
  onPreview?: () => void;
  onDecrease?: () => void;
  onIncrease?: () => void;
  onRemove?: () => void;
  forceStaticCount?: boolean;
}) {
  const previewImage = getPreferredDeckImage(card);
  const rowToneClass = getDeckRowToneClass(card?.color ?? []);
  const costBadgeClass = getDeckCostBadgeClass(card?.color ?? []);
  const showCostBadge = !forceStaticCount;

  return (
    <div className={`grid grid-cols-[60px_42px_minmax(0,1fr)_auto] items-center gap-2 border-b border-white/6 ${rowToneClass}`}>
      {onPreview ? (
        <button
          type="button"
          onClick={onPreview}
          className="block shrink-0 text-left"
          aria-label={`Preview ${card?.name ?? entry.card_number}`}
        >
          <div className="h-[64px] w-[60px] overflow-hidden bg-bg-tertiary">
            {previewImage ? (
              <img
                src={previewImage}
                alt={card?.name ?? entry.card_number}
                className="block h-full w-full scale-[1.64] object-cover object-[54%_-4%]"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-text-muted">
                {entry.card_number}
              </div>
            )}
          </div>
        </button>
      ) : (
        <Link to={`/cards/${entry.card_number}`} className="block shrink-0 hover:no-underline">
          <div className="h-[64px] w-[60px] overflow-hidden bg-bg-tertiary">
            {previewImage ? (
              <img
                src={previewImage}
                alt={card?.name ?? entry.card_number}
                className="block h-full w-full scale-[1.64] object-cover object-[54%_-4%]"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-text-muted">
                {entry.card_number}
              </div>
            )}
          </div>
        </Link>
      )}

      <div className="flex h-full items-center justify-center">
        {showCostBadge ? (
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[17px] font-extrabold leading-none text-white shadow-[0_8px_18px_rgba(0,0,0,0.28)] ${costBadgeClass}`}>
            {card?.cost ?? "-"}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 pl-1">
        <p className="min-w-0 truncate text-[13px] font-semibold text-text-primary">{card?.name ?? entry.card_number}</p>
        <p className="truncate text-[10px] font-medium text-text-secondary">{entry.card_number}</p>
        {card?.power != null && <p className="truncate text-[10px] text-text-secondary">Power {card.power}</p>}
        {card?.counter != null && <p className="truncate text-[10px] text-text-secondary">Counter +{card.counter}</p>}
      </div>

      {readOnly ? (
        <div className="flex min-w-[34px] items-center justify-center text-center text-xs font-semibold text-text-primary">
          x{entry.count}
        </div>
      ) : forceStaticCount ? (
        <div className="grid grid-cols-[auto_auto] items-center gap-1">
          <div className="flex min-w-[26px] items-center justify-center text-center text-xs font-semibold text-text-primary">
            x{entry.count}
          </div>
          {onRemove ? (
            <DeckActionButton
              label={`Remove ${card?.name ?? entry.card_number}`}
              onClick={onRemove}
              tone="danger"
            >
              <TrashIcon />
            </DeckActionButton>
          ) : <div className="h-6 w-6" />}
        </div>
      ) : (
        <div className="grid grid-cols-[auto_auto] items-center gap-1">
          <div className="flex min-w-[26px] items-center justify-center text-center text-xs font-semibold text-text-primary">
            x{entry.count}
          </div>
          <div className="grid grid-cols-1 grid-rows-2 gap-0.5">
            <DeckActionButton label={`Increase ${card?.name ?? entry.card_number}`} onClick={onIncrease}>
              +
            </DeckActionButton>
            <DeckActionButton label={`Decrease ${card?.name ?? entry.card_number}`} onClick={onDecrease}>
              -
            </DeckActionButton>
          </div>
        </div>
      )}
    </div>
  );
}

function DeckActionButton({
  children,
  label,
  onClick,
  tone = "neutral",
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  tone?: "neutral" | "danger";
}) {
  const lastActivationRef = useRef(0);
  const className = tone === "danger"
    ? "border-banned/30 bg-banned/10 text-banned hover:bg-banned/18 hover:text-[#ff8e8e]"
    : "border-border bg-bg-tertiary/25 text-text-primary hover:bg-bg-hover";

  return (
    <button
      type="button"
      onClick={() => {
        if (!onClick) return;
        const now = Date.now();
        if (now - lastActivationRef.current < 120) return;
        lastActivationRef.current = now;
        onClick();
      }}
      aria-label={label}
      disabled={!onClick}
      className={`flex h-6 w-6 items-center justify-center rounded-md border text-sm transition disabled:cursor-default disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

function getPreferredDeckImage(card?: CardDetail) {
  return card?.variants[0]?.media.scan_thumbnail_url
    ?? card?.variants[0]?.media.scan_url
    ?? card?.variants[0]?.media.thumbnail_url
    ?? card?.variants[0]?.media.image_url
    ?? null;
}

function getDeckRowToneClass(colors: string[]) {
  const normalized = [...new Set(colors.map((color) => color.trim().toLowerCase()).filter(Boolean))].sort();
  const key = normalized.join(",");

  switch (key) {
    case "red":
      return "bg-red-500/[0.08]";
    case "green":
      return "bg-emerald-500/[0.08]";
    case "blue":
      return "bg-sky-500/[0.08]";
    case "purple":
      return "bg-violet-500/[0.08]";
    case "black":
      return "bg-slate-400/[0.09]";
    case "yellow":
      return "bg-amber-400/[0.09]";
    case "blue,green":
      return "bg-gradient-to-r from-emerald-500/[0.08] to-sky-500/[0.08]";
    case "blue,purple":
      return "bg-gradient-to-r from-sky-500/[0.08] to-violet-500/[0.08]";
    case "green,yellow":
      return "bg-gradient-to-r from-emerald-500/[0.08] to-amber-400/[0.09]";
    case "black,red":
      return "bg-gradient-to-r from-slate-400/[0.09] to-red-500/[0.08]";
    case "purple,red":
      return "bg-gradient-to-r from-violet-500/[0.08] to-red-500/[0.08]";
    case "red,yellow":
      return "bg-gradient-to-r from-red-500/[0.08] to-amber-400/[0.09]";
    default:
      return "bg-white/[0.03]";
  }
}

function getDeckCostBadgeClass(colors: string[]) {
  const normalized = colors.map((color) => color.toLowerCase()).sort();
  const key = normalized.join(",");

  switch (key) {
    case "black":
      return "border-slate-300/20 bg-slate-800";
    case "blue":
      return "border-sky-300/25 bg-sky-700";
    case "green":
      return "border-emerald-300/25 bg-emerald-700";
    case "purple":
      return "border-violet-300/25 bg-violet-700";
    case "red":
      return "border-rose-300/25 bg-rose-700";
    case "yellow":
      return "border-amber-300/30 bg-amber-600 text-slate-950";
    case "blue,green":
      return "border-teal-200/25 bg-[linear-gradient(135deg,rgba(3,105,161,1)_0%,rgba(4,120,87,1)_100%)]";
    case "blue,purple":
      return "border-indigo-200/25 bg-[linear-gradient(135deg,rgba(3,105,161,1)_0%,rgba(91,33,182,1)_100%)]";
    case "blue,yellow":
      return "border-cyan-100/30 bg-[linear-gradient(135deg,rgba(3,105,161,1)_0%,rgba(217,119,6,1)_100%)]";
    case "green,purple":
      return "border-emerald-200/25 bg-[linear-gradient(135deg,rgba(4,120,87,1)_0%,rgba(91,33,182,1)_100%)]";
    case "green,yellow":
      return "border-lime-100/30 bg-[linear-gradient(135deg,rgba(4,120,87,1)_0%,rgba(217,119,6,1)_100%)]";
    case "purple,red":
      return "border-fuchsia-200/25 bg-[linear-gradient(135deg,rgba(91,33,182,1)_0%,rgba(190,24,93,1)_100%)]";
    case "red,yellow":
      return "border-orange-100/30 bg-[linear-gradient(135deg,rgba(190,24,93,1)_0%,rgba(217,119,6,1)_100%)]";
    default:
      return "border-white/20 bg-bg-tertiary";
  }
}

function sortDeckEntriesForDisplay(
  entries: DeckEntry[],
  cardsByNumber: Record<string, CardDetail>,
) {
  const rows = [...entries];
  return rows.sort((a, b) => {
    const cardA = cardsByNumber[a.card_number];
    const cardB = cardsByNumber[b.card_number];

    const diff = compareNullableNumber(cardA?.cost, cardB?.cost);
    if (diff !== 0) return diff;

    return a.card_number.localeCompare(b.card_number);
  });
}

function compareNullableNumber(a?: number | null, b?: number | null) {
  const left = typeof a === "number" ? a : Number.POSITIVE_INFINITY;
  const right = typeof b === "number" ? b : Number.POSITIVE_INFINITY;
  return left - right;
}

function HoverLabelIconButton({
  children,
  label,
  onClick,
  tone = "neutral",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "neutral" | "danger";
}) {
  const className = tone === "danger"
    ? "border-banned/30 bg-banned/10 text-banned hover:border-banned/45 hover:bg-banned/18 hover:text-[#ff8e8e]"
    : "border-border bg-bg-tertiary/25 text-text-primary hover:bg-bg-hover";

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${className}`}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute right-0 top-full mt-1 whitespace-nowrap rounded-md border border-border/70 bg-bg-primary/95 px-2 py-1 text-[10px] font-medium text-text-secondary opacity-0 shadow-md transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function CompactStatusPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "warn";
}) {
  const toneClass = tone === "ok"
    ? "border-legal/25 bg-legal/8 text-legal"
    : tone === "warn"
      ? "border-banned/20 bg-banned/8 text-[#f2c1c1]"
      : "border-border bg-bg-secondary/50 text-text-secondary";

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 ${toneClass}`}>
      <span className="text-[10px] uppercase tracking-[0.12em]">{label}</span>
      <span className="font-semibold text-text-primary">{value}</span>
    </div>
  );
}

function buildDeckWarnings(deck: Deck) {
  const warnings: string[] = [];

  const overLimit = deck.main.filter((entry) => entry.count > 4);
  if (overLimit.length > 0) {
    warnings.push(`Copy limit exceeded for ${overLimit.map((entry) => entry.card_number).join(", ")}.`);
  }

  return warnings;
}

function isDonCard(card: Card | CardDetail) {
  return card.card_type.toLowerCase().includes("don");
}

function buildDeckTitle(cardNumber: string, leaderName?: string | null) {
  const setCode = cardNumber.split("-", 1)[0] ?? cardNumber;
  const trimmedName = leaderName?.trim();
  return trimmedName ? `${setCode} ${trimmedName}` : setCode;
}

function buildCombinedSearchQuery(plainText: string, syntaxTokens: string[]) {
  return [plainText.trim(), ...syntaxTokens].filter(Boolean).join(" ");
}

function parseSearchQuery(query: string) {
  const normalized = query.replace(/\s+/g, " ");
  const hasTrailingWhitespace = /\s$/.test(query);
  const parts = normalized
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);

  const syntaxTokens: string[] = [];
  const plainTokens: string[] = [];

  parts.forEach((token, index) => {
    const isLastToken = index === parts.length - 1;
    const isCommitted = !isLastToken || hasTrailingWhitespace;
    const isSyntaxToken = /^(cost|power|counter)(>=|<=|=|>|<)\d+$/i.test(token);

    if (isCommitted && isSyntaxToken) {
      syntaxTokens.push(token);
      return;
    }

    plainTokens.push(token);
  });

  return {
    syntaxTokens,
    plainText: plainTokens.join(" "),
  };
}

function buildDeckStats(deck: Deck, cardsByNumber: Record<string, CardDetail>) {
  let totalCost = 0;
  let costCount = 0;
  let twoKs = 0;
  let oneKs = 0;
  let bricks = 0;
  let triggers = 0;
  let characters = 0;
  let events = 0;
  let stages = 0;

  for (const entry of deck.main) {
    const card = cardsByNumber[entry.card_number];
    if (!card) continue;

    if (typeof card.cost === "number") {
      totalCost += card.cost * entry.count;
      costCount += entry.count;
    }

    if (card.counter === 2000) {
      twoKs += entry.count;
    } else if (card.counter === 1000) {
      oneKs += entry.count;
    } else {
      bricks += entry.count;
    }

    if (typeof card.trigger === "string" && card.trigger.trim().length > 0) {
      triggers += entry.count;
    }

    const normalizedType = card.card_type.toLowerCase();
    if (normalizedType === "character") {
      characters += entry.count;
    } else if (normalizedType === "event") {
      events += entry.count;
    } else if (normalizedType === "stage") {
      stages += entry.count;
    }
  }

  return {
    averageCost: costCount > 0 ? (totalCost / costCount).toFixed(1) : "-",
    twoKs,
    oneKs,
    bricks,
    triggers,
    characters,
    events,
    stages,
  };
}

function buildDeckTypeCounts(deck: Deck, cardsByNumber: Record<string, CardDetail>) {
  const counts = new Map<string, number>();

  for (const entry of deck.main) {
    const card = cardsByNumber[entry.card_number];
    if (!card || !Array.isArray(card.types)) continue;

    const uniqueTypes = new Set(
      card.types
        .map((type) => type.trim())
        .filter(Boolean),
    );

    for (const type of uniqueTypes) {
      counts.set(type, (counts.get(type) ?? 0) + entry.count);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([type, count]) => ({ type, count }));
}

function buildDeckCurve(
  deck: Deck,
  cardsByNumber: Record<string, CardDetail>,
  mode: "type" | "counter",
) {
  const bins = [
    { label: "0", min: 0, max: 0, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0 },
    { label: "1", min: 1, max: 1, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0 },
    { label: "2", min: 2, max: 2, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0 },
    { label: "3", min: 3, max: 3, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0 },
    { label: "4", min: 4, max: 4, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0 },
    { label: "5", min: 5, max: 5, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0 },
    { label: "6", min: 6, max: 6, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0 },
    { label: "7", min: 7, max: 7, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0 },
    { label: "8", min: 8, max: 8, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0 },
    { label: "9", min: 9, max: 9, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0 },
    { label: "10", min: 10, max: Number.POSITIVE_INFINITY, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0 },
  ];

  for (const entry of deck.main) {
    const card = cardsByNumber[entry.card_number];
    const cost = card?.cost;
    if (typeof cost !== "number") continue;

    const bin = bins.find((candidate) => cost >= candidate.min && cost <= candidate.max);
    if (bin) {
      bin.count += entry.count;

      const normalizedType = card.card_type.toLowerCase();
      if (normalizedType === "character") {
        bin.character += entry.count;
      } else if (normalizedType === "event") {
        bin.event += entry.count;
      } else if (normalizedType === "stage") {
        bin.stage += entry.count;
      }

      if (card.counter === 2000) {
        bin.counter2k += entry.count;
      } else if (card.counter === 1000) {
        bin.counter1k += entry.count;
      } else {
        bin.counter0 += entry.count;
      }
    }
  }

  const maxCount = Math.max(1, ...bins.map((bin) => bin.count));
  return bins.map((bin) => {
    const segments = mode === "counter"
      ? [
          { key: "counter0", label: "0", count: bin.counter0, colorClass: "bg-slate-400/80" },
          { key: "counter1k", label: "1000", count: bin.counter1k, colorClass: "bg-sky-400/80" },
          { key: "counter2k", label: "2000", count: bin.counter2k, colorClass: "bg-amber-300/85" },
        ]
      : [
          { key: "character", label: "Character", count: bin.character, colorClass: "bg-emerald-400/80" },
          { key: "event", label: "Event", count: bin.event, colorClass: "bg-fuchsia-400/80" },
          { key: "stage", label: "Stage", count: bin.stage, colorClass: "bg-cyan-300/85" },
        ];

    return {
      ...bin,
      height: maxCount > 0 ? Math.round((bin.count / maxCount) * 100) : 0,
      segments: segments.map((segment) => ({
        ...segment,
        percentOfBin: bin.count > 0 ? (segment.count / bin.count) * 100 : 0,
      })),
    };
  });
}
