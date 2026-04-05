import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { useCard, useCardSearch, useCardsBatch, useFormats } from "../api/hooks";
import type { Card, CardDetail, CardVariant } from "../api/types";
import { CopyButton } from "../components/CopyButton";
import { DeckPageLoadingState } from "../components/deck/DeckPageLoadingState";
import { ActionModal, ModalBackdrop, ModalCloseButton, ModalSurface } from "../components/Modal";
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
  setLeaderVariant,
  setMainDeckEntryVariant,
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
type DeckChartMode = "bars" | "pies";
type PendingInternalNavigation = { path: string } | null;
type DeckViewerCardSize = "sm" | "md" | "lg";
type DeckQuantityBadgeSize = "sm" | "md" | "lg";
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
type TypePieSlice = {
  type: string;
  count: number;
  color: string;
  dotClass: string;
  offset: number;
  size: number;
};
type PreviewCardState = {
  card: Card;
  selectedVariantIndex?: number;
  onSelectVariant?: (variantIndex?: number) => void;
  onAddToDeck?: (variantIndex?: number) => void;
};
const SYNTAX_OPERATORS: SyntaxOperator[] = [">=", "<=", "=", ">", "<"];
const COUNTER_SYNTAX_OPERATORS: SyntaxOperator[] = [">=", "="];
const COUNTER_VALUES = ["", "1000", "2000"] as const;
const DECK_HISTORY_LIMIT = 50;
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
const DeckFitToScreenIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 3H3v5" />
    <path d="M16 3h5v5" />
    <path d="M21 16v5h-5" />
    <path d="M8 21H3v-5" />
    <path d="M3 8 9 2" />
    <path d="m15 2 6 6" />
    <path d="m21 16-6 6" />
    <path d="m9 22-6-6" />
  </svg>
);
const DeckExitFitIcon = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 9H3V3" />
    <path d="M15 9h6V3" />
    <path d="M15 15h6v6" />
    <path d="M9 15H3v6" />
    <path d="m3 3 7 7" />
    <path d="m21 3-7 7" />
    <path d="m21 21-7-7" />
    <path d="m3 21 7-7" />
  </svg>
);
const DeckCardSizeSmIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" stroke="rgba(12,16,22,0.32)" strokeWidth="1" aria-hidden="true">
    <rect x="4.75" y="5.25" width="6.75" height="12.75" rx="1.2" />
    <rect x="8.75" y="5.25" width="6.75" height="12.75" rx="1.2" />
    <rect x="12.75" y="5.25" width="6.75" height="12.75" rx="1.2" />
  </svg>
);
const DeckCardSizeMdIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="currentColor" stroke="rgba(12,16,22,0.32)" strokeWidth="1" aria-hidden="true">
    <rect x="1.5" y="2.5" width="9.5" height="18" rx="1.5" />
    <rect x="7.25" y="2.5" width="9.5" height="18" rx="1.5" />
    <rect x="13" y="2.5" width="9.5" height="18" rx="1.5" />
  </svg>
);
const ExternalLinkArrowIcon = () => (
  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 12.5 12.5 3.5" />
    <path d="M6 3.5h6.5V10" />
  </svg>
);
const TCGPLAYER_AFFILIATE_BASE_URL = "https://partner.tcgplayer.com/poneglyph";
const DECK_SURFACE_CLASS = "rounded-2xl border border-border/70 bg-bg-card/72";
const DECK_SUBSURFACE_CLASS = "rounded-xl border border-border/55 bg-bg-card/35";
const DECK_CONTROL_CLASS = "inline-flex h-7 items-center justify-center rounded-md border border-border/70 bg-bg-input/70 px-2 text-[10px] font-medium leading-none text-text-primary transition hover:bg-bg-hover";
const DECK_HEADER_ACTION_CLASS = `${DECK_CONTROL_CLASS} gap-1.5 px-2.5 text-[11px]`;

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
    <DeckPageLoadingState
      title="Creating deck"
      description="Generating a fresh deck link and opening the editor."
    />
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
  const [deckChartMode, setDeckChartMode] = useState<DeckChartMode>("bars");
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
  const [confirmClearDeckOpen, setConfirmClearDeckOpen] = useState(false);
  const [pendingInternalNavigation, setPendingInternalNavigation] = useState<PendingInternalNavigation>(null);
  const [deckViewerCardSize, setDeckViewerCardSize] = useState<DeckViewerCardSize>("md");
  const [deckViewerOverview, setDeckViewerOverview] = useState(false);
  const [undoHistory, setUndoHistory] = useState<Deck[]>([]);
  const [redoHistory, setRedoHistory] = useState<Deck[]>([]);
  const [syntaxDrafts, setSyntaxDrafts] = useState<Record<SyntaxField, SyntaxDraft>>({
    cost: { operator: ">=", value: "" },
    power: { operator: ">=", value: "" },
    counter: { operator: ">=", value: "" },
  });
  const [traitDraft, setTraitDraft] = useState("");
  const [legalDraftFormatIndex, setLegalDraftFormatIndex] = useState(0);
  const [previewCard, setPreviewCard] = useState<PreviewCardState | null>(null);
  const hydratedHashRef = useRef<string | null>(null);
  const ignoreNextPopStateRef = useRef(false);
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
      setUndoHistory([]);
      setRedoHistory([]);
      setLoadError("Deck hash is missing.");
      return;
    }

    let cancelled = false;
    void decodeDeckHash(hash).then((decoded) => {
      if (cancelled) return;
      hydratedHashRef.current = hash;
      setCurrentHash(hash);
      setDeck(decoded);
      setPendingInternalNavigation(null);
      setUndoHistory([]);
      setRedoHistory([]);
      setLoadError(null);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setDeck(null);
      setPendingInternalNavigation(null);
      setUndoHistory([]);
      setRedoHistory([]);
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
  const previewQuery = useCard(previewCard?.card.card_number ?? "", "en", Boolean(previewCard));

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
  const canSaveToLibrary = Boolean(deck && effectiveHash && (!savedDeckId || (mode === "edit" && isDirtySavedDeck)));
  const canSaveAsNewToLibrary = Boolean(mode === "edit" && canSaveToLibrary);
  const exportText = deck ? buildDeckExport(deck) : "";
  const totalMainCards = deck ? mainDeckCount(deck) : 0;
  const totalUniqueMain = deck ? uniqueMainCount(deck) : 0;
  const warnings = deck ? buildDeckWarnings(deck) : [];
  const previewDetail = previewQuery.data?.data ?? null;
  const leaderTitle = deck?.leader
    ? buildDeckTitle(deck.leader.card_number, cardsByNumber[deck.leader.card_number]?.name)
    : "Deck Builder";
  const deckStats = deck ? buildDeckStats(deck, cardsByNumber) : null;
  const deckTraitCounts = deck ? buildDeckTypeCounts(deck, cardsByNumber) : [];
  const deckTraitPairCounts = deck ? buildDeckTraitCounts(deck, cardsByNumber) : [];
  const deckCurveByType = deck ? buildDeckCurve(deck, cardsByNumber, "type") : [];
  const deckCurveByCounter = deck ? buildDeckCurve(deck, cardsByNumber, "counter") : [];
  const formatsQuery = useFormats();
  const formatNames = useMemo(
    () => (formatsQuery.data?.data ?? []).map((f) => f.name),
    [formatsQuery.data],
  );
  const deckLegality = useMemo(
    () => deck ? buildDeckLegality(deck, cardsByNumber, formatNames) : [],
    [deck, cardsByNumber, formatNames],
  );
  const deckCardTypeCounts = useMemo(
    () => [
      { type: "character", count: deckStats?.characters ?? 0 },
      { type: "event", count: deckStats?.events ?? 0 },
      { type: "stage", count: deckStats?.stages ?? 0 },
    ].filter((entry) => entry.count > 0),
    [deckStats],
  );
  const deckCounterCounts = useMemo(
    () => [
      { type: "0", count: deckStats?.bricks ?? 0 },
      { type: "1k", count: deckStats?.oneKs ?? 0 },
      { type: "2k", count: deckStats?.twoKs ?? 0 },
    ].filter((entry) => entry.count > 0),
    [deckStats],
  );
  const sortedMainDeckEntries = useMemo(
    () => deck ? sortDeckEntriesForDisplay(deck.main, cardsByNumber) : [],
    [cardsByNumber, deck],
  );
  const showDeckSidebar = mode === "edit" || !deckViewerOverview;

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

      event.preventDefault();
      event.stopPropagation();
      setPendingInternalNavigation({ path: `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}` });
    };

    const handlePopState = () => {
      if (ignoreNextPopStateRef.current) {
        ignoreNextPopStateRef.current = false;
        return;
      }

      const currentUrl = new URL(window.location.href);
      ignoreNextPopStateRef.current = true;
      window.history.go(1);
      setPendingInternalNavigation({ path: `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}` });
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
    return <DeckPageLoadingState title="Loading deck" description="Decoding the deck link and preparing the editor." />;
  }

  const closePreview = () => {
    setPreviewCard(null);
  };

  const setPreviewSelectedVariant = (variantIndex?: number) => {
    setPreviewCard((current) => current
      ? {
          ...current,
          selectedVariantIndex: variantIndex,
        }
      : current);
  };

  const previewSearchCard = (card: Card) => {
    const isLeader = card.card_type.toLowerCase() === "leader";
    const existingEntry = isLeader
      ? (deck.leader?.card_number === card.card_number ? deck.leader : null)
      : (deck.main.find((entry) => entry.card_number === card.card_number) ?? null);

    setPreviewCard({
      card,
      selectedVariantIndex: existingEntry?.variant_index ?? card.variant_index,
      onSelectVariant: existingEntry
        ? (variantIndex) => {
          setPreviewSelectedVariant(variantIndex);
          updateDeck((current) => (
            isLeader
              ? setLeaderVariant(current, variantIndex)
              : setMainDeckEntryVariant(current, card.card_number, variantIndex)
          ));
        }
        : undefined,
      onAddToDeck: mode === "edit"
        ? (variantIndex) => {
          setPreviewSelectedVariant(variantIndex);
          updateDeck((current) => addCardToDeck(
            current,
            variantIndex == null ? card : { ...card, variant_index: variantIndex },
          ));
        }
        : undefined,
    });
  };

  const previewDeckEntry = (entry: DeckEntry, card?: CardDetail, isLeader = false) => {
    if (!card) return;

    setPreviewCard({
      card,
      selectedVariantIndex: entry.variant_index,
      onSelectVariant: mode === "edit"
        ? (variantIndex) => {
          setPreviewSelectedVariant(variantIndex);
          updateDeck((current) => (
            isLeader
              ? setLeaderVariant(current, variantIndex)
              : setMainDeckEntryVariant(current, entry.card_number, variantIndex)
          ));
        }
        : undefined,
    });
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

  const commitDeck = (nextDeck: Deck, previousDeck?: Deck | null) => {
    if (previousDeck && isSameDeckState(previousDeck, nextDeck)) return;
    if (previousDeck) {
      setUndoHistory((current) => [...current, previousDeck].slice(-DECK_HISTORY_LIMIT));
      setRedoHistory([]);
    }
    setDeck(nextDeck);
    syncDeckUrl(nextDeck);
  };

  const updateDeck = (updater: (current: Deck) => Deck) => {
    setDeck((current) => {
      if (!current) return current;
      const nextDeck = updater(current);
      if (isSameDeckState(current, nextDeck)) {
        return current;
      }
      setUndoHistory((history) => [...history, current].slice(-DECK_HISTORY_LIMIT));
      setRedoHistory([]);
      syncDeckUrl(nextDeck);
      return nextDeck;
    });
  };

  const clearDeck = () => {
    if (!deck) return;
    commitDeck({
      ...createEmptyDeck(),
      updated_at: Date.now(),
    }, deck);
  };

  const undoLastDeckChange = () => {
    if (!deck || undoHistory.length === 0) return;
    const previousDeck = undoHistory[undoHistory.length - 1]!;
    setUndoHistory((current) => current.slice(0, -1));
    setRedoHistory((current) => [...current, deck].slice(-DECK_HISTORY_LIMIT));
    setDeck(previousDeck);
    syncDeckUrl(previousDeck);
  };

  const redoLastDeckChange = () => {
    if (!deck || redoHistory.length === 0) return;
    const nextDeck = redoHistory[redoHistory.length - 1]!;
    setRedoHistory((current) => current.slice(0, -1));
    setUndoHistory((current) => [...current, deck].slice(-DECK_HISTORY_LIMIT));
    setDeck(nextDeck);
    syncDeckUrl(nextDeck);
  };

  const saveDeckToLibrary = () => {
    if (!deck || !effectiveHash) return;

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
    navigate(
      mode === "edit"
        ? deckHashToEditPath(effectiveHash, savedDeck.id)
        : deckHashToViewPath(effectiveHash, savedDeck.id),
      { replace: true },
    );
  };

  const saveDeckAsNewToLibrary = () => {
    if (mode !== "edit" || !deck || !effectiveHash) return;

    const savedDeck = createSavedDeckRecord(effectiveHash, deck, {
      folderId: savedDeckRecord?.folderId ?? null,
      localName: savedDeckRecord?.localName ?? null,
    });

    setSavedDeckRevision((current) => current + 1);
    hydratedHashRef.current = effectiveHash;
    setCurrentHash(effectiveHash);
    setSaveError(null);
    navigate(deckHashToEditPath(effectiveHash, savedDeck.id), { replace: true });
  };

  const proceedPendingInternalNavigation = () => {
    if (!pendingInternalNavigation) return;
    const nextPath = pendingInternalNavigation.path;
    setPendingInternalNavigation(null);
    navigate(nextPath);
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

  const appendSimpleSyntaxToken = (token: string) => {
    if (syntaxSearchTokens.includes(token)) return;
    setSearchQuery(buildCombinedSearchQuery(plainSearchText, [...syntaxSearchTokens, token]));
  };

  const appendTraitSyntaxToken = () => {
    const trimmedTrait = traitDraft.trim().replace(/^"+|"+$/g, "");
    if (!trimmedTrait) return;
    const token = `trait:"${trimmedTrait}"`;
    if (syntaxSearchTokens.includes(token)) return;
    setSearchQuery(buildCombinedSearchQuery(plainSearchText, [...syntaxSearchTokens, token]));
    setTraitDraft("");
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
      const operatorOptions = field === "counter" ? COUNTER_SYNTAX_OPERATORS : SYNTAX_OPERATORS;
      const currentOperator = current[field].operator;
      const currentIndex = operatorOptions.indexOf(currentOperator);
      const nextOperator = operatorOptions[(currentIndex + 1) % operatorOptions.length] ?? ">=";
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
      <section className={`${DECK_SURFACE_CLASS} p-2 sm:p-3`}>
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

              <div className="flex w-full flex-col gap-1.5 lg:w-auto lg:items-end">
                <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                  {canSaveToLibrary && (
                    <button
                      type="button"
                      onClick={saveDeckToLibrary}
                      className={`${DECK_HEADER_ACTION_CLASS} border-accent/55 bg-accent/16 text-text-primary shadow-[0_0_0_1px_rgba(255,255,255,0.02)] hover:bg-accent/24`}
                    >
                      <DeckSaveActionIcon />
                      Save
                    </button>
                  )}
                  {canSaveAsNewToLibrary && (
                    <button
                      type="button"
                      onClick={saveDeckAsNewToLibrary}
                      className={DECK_HEADER_ACTION_CLASS}
                    >
                      <DeckSaveActionIcon />
                      Save New
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
                </div>
                <div className="grid grid-cols-2 gap-1.5 lg:flex lg:flex-wrap lg:justify-end">
                  {sharePath && (
                    <div className="inline-flex min-w-0 items-center justify-between gap-1.5 rounded-md border border-border/70 bg-bg-input/70 px-2 py-1 text-[11px] text-text-secondary">
                      <span className="font-medium text-text-primary lg:hidden">Deck URL</span>
                      <span className="hidden max-w-40 truncate lg:block lg:text-text-secondary xl:max-w-56">{sharePath}</span>
                      <CopyButton value={shareUrl} label="Copy deck link" copiedLabel="Copied deck link" />
                    </div>
                  )}
                  <div className="inline-flex min-w-0 items-center justify-between gap-1.5 rounded-md border border-border/70 bg-bg-input/70 px-2 py-1 text-[11px] text-text-secondary">
                    <span className="font-medium text-text-primary">Decklist</span>
                    <CopyButton
                      value={exportText}
                      label="Copy decklist"
                      copiedLabel="Copied decklist"
                    />
                  </div>
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
              {deckLegality.map((result) => (
                <LegalityPill key={result.format} result={result} />
              ))}
              {batchQuery.data && batchQuery.data.missing.length > 0 && (
                <span className="text-text-muted">Missing: {batchQuery.data.missing.join(", ")}</span>
              )}
            </div>

            {(deckCurveByType.length > 0 || deckCurveByCounter.length > 0) && (
              <div className={`${DECK_SUBSURFACE_CLASS} bg-bg-tertiary/10 px-1.5 py-2 sm:px-2`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[16px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
                    Charts
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurveOpen((current) => !current)}
                      className={`${DECK_CONTROL_CLASS} h-6 min-w-[60px] gap-1.5 px-1.5 text-[9px] tracking-[0.02em] text-text-secondary`}
                      aria-expanded={curveOpen}
                    >
                      {curveOpen ? <HideIcon /> : <ShowIcon />}
                      {curveOpen ? "Hide" : "Show"}
                    </button>
                    <div className="inline-flex items-center rounded-md border border-border/70 bg-bg-input/70 p-[2px]">
                      {(["bars", "pies"] as const).map((mode) => (
                        <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setDeckChartMode(mode);
                          if (!curveOpen) {
                            setCurveOpen(true);
                          }
                        }}
                        aria-label={mode === "bars" ? "Bar charts" : "Pie charts"}
                        title={mode === "bars" ? "Bar charts" : "Pie charts"}
                        className={`inline-flex h-6 w-8 items-center justify-center rounded-[3px] transition ${
                          deckChartMode === mode
                            ? "bg-bg-card text-text-primary"
                            : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                        }`}
                        >
                          {mode === "bars" ? <BarsIcon /> : <PieIcon />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {curveOpen && (
                  <div className="mt-2">
                    {deckChartMode === "bars" ? (
                      <div className="space-y-2">
                        <div className="px-1 py-1.5 sm:px-1.5 sm:py-2">
                          <div className="flex min-h-[22px] flex-wrap items-start gap-x-3 gap-y-1 text-[13px] text-text-secondary">
                            <div className="inline-flex flex-wrap items-center gap-1">
                              <span className="font-medium uppercase tracking-[0.08em] text-text-muted">card type</span>
                              {deckCurveByType[0]?.segments.map((segment) => (
                                <span key={segment.key} className="inline-flex items-center gap-1">
                                  <span className={`h-2 w-2 ${segment.colorClass}`} />
                                  <span>{segment.label}</span>
                                </span>
                              ))}
                            </div>
                            <div className="inline-flex flex-wrap items-center gap-1">
                              <span className="font-medium uppercase tracking-[0.08em] text-text-muted">counter</span>
                              {deckCurveByCounter[0]?.segments.map((segment) => (
                                <span key={segment.key} className="inline-flex items-center gap-1">
                                  <span className={`h-2 w-2 ${segment.colorClass}`} />
                                  <span>{segment.label}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-2 lg:grid-cols-[minmax(0,11fr)_minmax(0,3fr)]">
                          <div className="px-1 py-1.5 sm:px-1.5 sm:py-2">
                            <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">Cost</div>
                            <CombinedCostCurveChart
                              typeCurve={deckCurveByType}
                              curveTooltip={curveTooltip}
                              onClearTooltip={() => setCurveTooltip(null)}
                              onShowTooltip={showCurveTooltip}
                              showLegend={false}
                            />
                          </div>
                          <div className="px-1 py-1.5 sm:px-1.5 sm:py-2 lg:border-l lg:border-border/60 lg:pl-3">
                            <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">Counter</div>
                            <CounterBarChart
                              bricks={deckStats?.bricks ?? 0}
                              oneKs={deckStats?.oneKs ?? 0}
                              twoKs={deckStats?.twoKs ?? 0}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-2 lg:grid-cols-2">
                        <div className="px-1 py-1.5 sm:px-1.5 sm:py-2">
                          <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">Card Type</div>
                          <TypePieChart counts={deckCardTypeCounts} />
                        </div>
                        <div className="px-1 py-1.5 sm:px-1.5 sm:py-2 lg:border-l lg:border-border/60 lg:pl-3">
                          <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">Counter</div>
                          <TypePieChart counts={deckCounterCounts} />
                        </div>
                        <div className="px-1 py-1.5 sm:px-1.5 sm:py-2">
                          <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">Traits</div>
                          <TypePieChart counts={deckTraitCounts} />
                        </div>
                        <div className="px-1 py-1.5 sm:px-1.5 sm:py-2 lg:border-l lg:border-border/60 lg:pl-3">
                          <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">Trait Pairs</div>
                          <TypePieChart counts={deckTraitPairCounts} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {warnings.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {warnings.map((warning) => (
                  <p key={warning} className="rounded-md border border-banned/25 bg-banned/8 px-2.5 py-1.5 text-[11px] text-[#f2b0b0]">
                    {warning}
                  </p>
                ))}
              </div>
            )}

            {mode === "edit" && (
              <div className="relative mt-auto pt-2">
                  <div className="flex flex-col gap-2">
                  <div
                    className="flex min-h-10 min-w-0 flex-1 flex-wrap items-center gap-1 rounded-xl border border-border/70 bg-bg-input/70 px-1.5 py-1 transition-colors focus-within:border-accent/70 sm:px-2"
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
                        className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-bg-tertiary/18 px-2 py-1 text-[10px] text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
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
                      onKeyDown={(event) => {
                        if (event.key !== "Backspace") return;
                        if (plainSearchText.length > 0 || syntaxSearchTokens.length === 0) return;
                        if (event.currentTarget.selectionStart !== 0 || event.currentTarget.selectionEnd !== 0) return;

                        event.preventDefault();
                        removeSearchToken(syntaxSearchTokens[syntaxSearchTokens.length - 1]!);
                      }}
                      placeholder={!deck.leader ? "Search leaders..." : "Search cards..."}
                      className="min-w-0 flex-1 bg-transparent py-1 text-sm text-text-primary outline-none placeholder:text-text-muted"
                    />
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!searchQuery) return;
                        setSearchQuery("");
                      }}
                      aria-label="Clear search"
                      title="Clear search"
                      disabled={!searchQuery}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-bg-tertiary/18 text-text-secondary transition hover:bg-bg-hover hover:text-text-primary disabled:cursor-default disabled:opacity-35"
                    >
                      <ClearSearchIcon />
                    </button>
                  </div>
                  <div className="flex items-center justify-end gap-2 md:hidden">
                    <button
                      type="button"
                      onClick={() => setSyntaxHelperOpen((current) => !current)}
                      aria-label="Toggle syntax helper"
                      className={`${DECK_CONTROL_CLASS} gap-1.5 px-2 text-[9px] tracking-[0.02em] ${syntaxHelperOpen
                        ? "border-accent/55 bg-accent/14 text-text-primary"
                        : "text-text-secondary"}`}
                    >
                      <SyntaxIcon />
                      Syntax
                    </button>
                  </div>
                </div>
                <div className={`${syntaxHelperOpen ? "block" : "hidden"} absolute left-0 right-0 top-full z-20 mt-1 rounded-xl border border-border/70 bg-bg-card/96 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.32)] backdrop-blur md:static md:z-auto md:mt-2 md:block md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-0`}>
                    <div className="grid grid-cols-1 gap-1.5 md:flex md:flex-wrap md:items-center">
                      {(["cost", "power", "counter"] as SyntaxField[]).map((field) => {
                        const draft = syntaxDrafts[field];
                        return (
                          <div key={field} className="flex min-w-0 items-center gap-1 rounded-md border border-border/60 bg-bg-tertiary/10 px-1 py-1">
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
                      <div className="flex min-w-0 items-center gap-1 rounded-md border border-border/60 bg-bg-tertiary/10 px-1 py-1">
                        <span className="min-w-0 text-[9px] font-medium uppercase tracking-[0.06em] text-text-secondary">
                          Trigger
                        </span>
                        <button
                          type="button"
                          onClick={() => appendSimpleSyntaxToken("has:trigger")}
                          className="flex h-5 w-5 items-center justify-center border border-border/55 bg-bg-input/75 text-[10px] font-semibold text-text-primary transition hover:bg-bg-hover"
                          aria-label="Add trigger syntax filter"
                        >
                          +
                        </button>
                      </div>
                      <div className="flex min-w-0 items-center gap-1 rounded-md border border-border/60 bg-bg-tertiary/10 px-1 py-1">
                        <span className="min-w-0 text-[9px] font-medium uppercase tracking-[0.06em] text-text-secondary">
                          Trait
                        </span>
                        <input
                          value={traitDraft}
                          onChange={(event) => setTraitDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();
                            appendTraitSyntaxToken();
                          }}
                          placeholder="straw hat"
                          className="h-5 w-24 border border-border/55 bg-bg-input/75 px-1.5 text-[8px] font-medium text-text-primary outline-none placeholder:text-text-muted"
                        />
                        <button
                          type="button"
                          onClick={appendTraitSyntaxToken}
                          disabled={traitDraft.trim().length === 0}
                          className="flex h-5 w-5 items-center justify-center border border-border/55 bg-bg-input/75 text-[10px] font-semibold text-text-primary transition hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-35"
                          aria-label="Add trait syntax filter"
                        >
                          +
                        </button>
                      </div>
                      {formatNames.length > 0 && (
                        <div className="flex min-w-0 items-center gap-1 rounded-md border border-border/60 bg-bg-tertiary/10 px-1 py-1">
                          <span className="min-w-0 text-[9px] font-medium uppercase tracking-[0.06em] text-text-secondary">
                            Legal
                          </span>
                          <button
                            type="button"
                            onClick={() => setLegalDraftFormatIndex((i) => (i + 1) % formatNames.length)}
                            className="flex h-5 items-center justify-center border border-border/55 bg-bg-input/75 px-1.5 text-[8px] font-medium text-text-primary transition hover:bg-bg-hover"
                            aria-label="Cycle format"
                          >
                            {formatNames[legalDraftFormatIndex % formatNames.length]}
                          </button>
                          <button
                            type="button"
                            onClick={() => appendSimpleSyntaxToken(`legal:${formatNames[legalDraftFormatIndex % formatNames.length]}`)}
                            className="flex h-5 w-5 items-center justify-center border border-border/55 bg-bg-input/75 text-[10px] font-semibold text-text-primary transition hover:bg-bg-hover"
                            aria-label="Add legality syntax filter"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                </div>
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

      <div className={`grid gap-3 ${mode === "edit" ? "xl:grid-cols-[minmax(0,2fr)_300px]" : showDeckSidebar ? "lg:grid-cols-[minmax(0,2fr)_300px]" : ""}`}>
        <section className={`${DECK_SURFACE_CLASS} p-2 sm:p-3`}>
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
                        onPreview={() => previewSearchCard(card)}
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
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/55 bg-bg-card/35 px-2.5 py-2">
                <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-bg-input/50 p-1">
                  {(["sm", "md"] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setDeckViewerCardSize(size)}
                      aria-label={`Set ${size} card size`}
                      title={`Set ${size} card size`}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition ${
                        deckViewerCardSize === size
                          ? "bg-accent text-[#eef2f7]"
                          : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                      }`}
                    >
                      {size === "sm" ? <DeckCardSizeSmIcon /> : <DeckCardSizeMdIcon />}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setDeckViewerOverview((current) => !current)}
                  className={`${DECK_CONTROL_CLASS} w-7 px-0`}
                  aria-label={deckViewerOverview ? "Show deck details" : "Fit deck to screen"}
                  title={deckViewerOverview ? "Show deck details" : "Fit deck to screen"}
                >
                  {deckViewerOverview ? <DeckExitFitIcon /> : <DeckFitToScreenIcon />}
                </button>
              </div>
              {deckViewerOverview ? (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">Full Deck</div>
                    <div className="text-[11px] text-text-secondary">
                      {(deck.leader ? 1 : 0) + deck.main.length} cards shown
                    </div>
                  </div>
                  <div className={getReadOnlyDeckGridClass(deckViewerCardSize, true)}>
                    {deck.leader && (
                      <ReadOnlyDeckTile
                        entry={{ ...deck.leader, count: 1 }}
                        card={cardsByNumber[deck.leader.card_number]}
                        onPreview={() => previewDeckEntry({ ...deck.leader!, count: 1 }, cardsByNumber[deck.leader!.card_number], true)}
                        size={deckViewerCardSize}
                        compact
                        isLeader
                      />
                    )}
                    {sortedDeckEntries(deck).map((entry) => (
                      <ReadOnlyDeckTile
                        key={entry.card_number}
                        entry={entry}
                        card={cardsByNumber[entry.card_number]}
                        onPreview={() => previewDeckEntry(entry, cardsByNumber[entry.card_number])}
                        size={deckViewerCardSize}
                        compact
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <>
              {deck.leader && (
                <div>
                  <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">Leader</div>
                  <div className={getReadOnlyDeckGridClass(deckViewerCardSize, false)}>
                    <ReadOnlyDeckTile
                      entry={{ ...deck.leader, count: 1 }}
                      card={cardsByNumber[deck.leader.card_number]}
                      onPreview={() => previewDeckEntry({ ...deck.leader!, count: 1 }, cardsByNumber[deck.leader!.card_number], true)}
                      size={deckViewerCardSize}
                      isLeader
                    />
                  </div>
                </div>
              )}
              <div>
                <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-text-muted">Main Deck</div>
                {deck.main.length > 0 ? (
                  <div className={getReadOnlyDeckGridClass(deckViewerCardSize, false)}>
                    {sortedDeckEntries(deck).map((entry) => (
                      <ReadOnlyDeckTile
                        key={entry.card_number}
                        entry={entry}
                        card={cardsByNumber[entry.card_number]}
                        onPreview={() => previewDeckEntry(entry, cardsByNumber[entry.card_number])}
                        size={deckViewerCardSize}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-border/70 bg-bg-tertiary/10 px-3 py-6 text-center text-xs text-text-secondary">
                    No cards in this deck.
                  </p>
                )}
              </div>
                </>
              )}
            </div>
          )}
        </section>

        {(mode === "edit" || (mode === "view" && showDeckSidebar)) && (
          <section className="space-y-3">
            <section className={`overflow-hidden rounded-t-2xl rounded-b-none border border-border/70 bg-bg-card/72 pt-2.5 sm:pt-3`}>
              <div className="mb-3 space-y-2 px-2 sm:px-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-text-primary">Deck</h2>
                  {mode === "edit" && (
                    <div className="flex items-center gap-1.5">
                      <HoverLabelIconButton label="Undo last change" onClick={undoLastDeckChange} disabled={undoHistory.length === 0}>
                        <UndoIcon />
                      </HoverLabelIconButton>
                      <HoverLabelIconButton label="Redo last change" onClick={redoLastDeckChange} disabled={redoHistory.length === 0}>
                        <RedoIcon />
                      </HoverLabelIconButton>
                      <HoverLabelIconButton label="Clear deck" onClick={() => setConfirmClearDeckOpen(true)} tone="danger">
                        <TrashIcon />
                      </HoverLabelIconButton>
                    </div>
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
                  onPreview={() => previewDeckEntry({ ...deck.leader!, count: 1 }, cardsByNumber[deck.leader!.card_number], true)}
                  onRemove={mode === "edit" ? () => updateDeck((current) => removeLeader(current)) : undefined}
                  forceStaticCount
                />
              ) : (
                <div className="mb-3 px-2 text-[11px] text-text-muted sm:px-3">Leader will stay pinned here once selected.</div>
              )}

              {deck.main.length === 0 ? (
                <p className="mx-2 rounded-xl border border-dashed border-border/70 bg-bg-tertiary/10 px-3 py-4 text-center text-xs text-text-secondary sm:mx-3">
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
                      onPreview={() => previewDeckEntry(entry, cardsByNumber[entry.card_number])}
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
          card={previewCard.card}
          detail={previewDetail}
          isLoading={previewQuery.isLoading}
          loadError={previewQuery.error instanceof Error ? previewQuery.error.message : null}
          selectedVariantIndex={previewCard.selectedVariantIndex}
          onSelectVariant={previewCard.onSelectVariant}
          onAddToDeck={previewCard.onAddToDeck}
          onClose={closePreview}
        />
      )}
      {confirmClearDeckOpen && (
        <ActionModal
          onClose={() => setConfirmClearDeckOpen(false)}
          title="Clear deck?"
          description="This will remove the leader and all main-deck cards from the current deck."
          actions={[
            { label: "Cancel", onClick: () => setConfirmClearDeckOpen(false) },
            {
              label: "Clear deck",
              onClick: () => {
                clearDeck();
                setConfirmClearDeckOpen(false);
              },
              tone: "danger",
            },
          ]}
        />
      )}
      {pendingInternalNavigation && (
        <ActionModal
          onClose={() => setPendingInternalNavigation(null)}
          eyebrow="Unsaved Changes"
          title="Leave this deck?"
          description="This saved deck has unsaved changes."
          actions={[
            { label: "Cancel", onClick: () => setPendingInternalNavigation(null) },
            {
              label: "Leave Don’t Save",
              onClick: proceedPendingInternalNavigation,
              tone: "danger",
            },
            {
              label: "Save and Leave",
              onClick: () => {
                saveDeckToLibrary();
                proceedPendingInternalNavigation();
              },
              tone: "primary",
            },
          ]}
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
  const thumbnailUrl = card.scan_thumb_url ?? card.scan_url ?? card.thumbnail_url ?? card.image_url;
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
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/85 via-black/25 to-transparent p-2.5">
              {currentCount > 0 && (
                <DeckQuantityBadge
                  label={isLeader ? "SET" : `x${currentCount}`}
                  size="md"
                />
              )}
              <span className="ml-auto rounded-md border border-white/18 bg-black/55 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)]">
                {card.card_number}
              </span>
            </div>
          </div>
          <div className="space-y-1.5 p-2.5">
            <div className="flex items-center gap-1.5">
              <p className="min-w-0 truncate text-[13px] font-semibold leading-tight text-text-primary">
                {card.name}
              </p>
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
  size = "md",
  compact = false,
  isLeader = false,
  showPreviewButton = true,
}: {
  entry: DeckEntry;
  card?: CardDetail;
  onPreview: () => void;
  size?: DeckViewerCardSize;
  compact?: boolean;
  isLeader?: boolean;
  showPreviewButton?: boolean;
}) {
  const thumbnailUrl = getPreferredDeckImage(card, entry.variant_index);
  const variantSummary = getCardVariantSummary(getPreferredDeckVariant(card, entry.variant_index));
  const nameClass = compact
    ? "min-w-0 truncate text-[11px] font-semibold leading-tight text-text-primary"
    : "min-w-0 truncate text-[13px] font-semibold leading-tight text-text-primary";
  const bodyClass = compact ? "space-y-1 p-1.5" : "space-y-1.5 p-2.5";
  const countLabel = isLeader ? "LDR" : `x${entry.count}`;
  const tileClass = getReadOnlyDeckTileClass(size, compact);
  const previewButtonPositionClass = getReadOnlyDeckTilePreviewPositionClass(size, compact);
  const imageOverlayPaddingClass = getReadOnlyDeckTileOverlayPaddingClass(size, compact);
  const cardNumberBadgeClass = compact
    ? "rounded-md border border-white/18 bg-black/55 px-1 py-0.5 text-[9px] font-medium leading-none text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
    : "rounded-md border border-white/18 bg-black/55 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)]";

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onPreview}
        className={`block w-full text-left ${tileClass}`}
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
            <div className={`pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/85 via-black/25 to-transparent ${imageOverlayPaddingClass}`}>
              <DeckQuantityBadge label={countLabel} size={size} compact={compact} />
              <span className={cardNumberBadgeClass}>{entry.card_number}</span>
            </div>
          </div>
          <div className={bodyClass}>
            <div className="flex items-center gap-1.5">
              <p className={nameClass}>
                {card?.name ?? entry.card_number}
              </p>
            </div>
            {!compact ? (
              <>
                <p className="truncate text-[10px] text-text-secondary">
                  {card?.card_type ?? "Unknown"}
                  {card?.cost != null ? ` - Cost ${card.cost}` : ""}
                  {(card?.color?.length ?? 0) > 0 ? ` - ${card!.color.join("/")}` : ""}
                </p>
                {variantSummary ? (
                  <p className="truncate text-[10px] text-text-secondary">{variantSummary}</p>
                ) : null}
              </>
            ) : variantSummary ? (
              <p className="truncate text-[9px] text-text-secondary">{variantSummary}</p>
            ) : null}
          </div>
        </div>
      </button>

      {showPreviewButton && (
        <div className={`absolute ${previewButtonPositionClass}`}>
          <SearchTileActionButton label={`Preview ${card?.name ?? entry.card_number}`} onClick={onPreview} size={size}>
            <MagnifierIcon />
          </SearchTileActionButton>
        </div>
      )}
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
      className="pointer-events-none absolute z-10 min-w-[168px] rounded-xl border border-border/70 bg-bg-primary/97 px-3.5 py-2.5 text-[13px] font-medium leading-snug text-text-primary shadow-[0_14px_32px_rgba(0,0,0,0.4)]"
      style={style}
    >
      {children}
    </div>
  );
}

function CombinedCostCurveChart({
  typeCurve,
  curveTooltip,
  onClearTooltip,
  onShowTooltip,
  showLegend = true,
}: {
  typeCurve: DeckCurveBin[];
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
  showLegend?: boolean;
}) {
  if (typeCurve.length === 0) return null;

  const bins = typeCurve.map((typeBin) => ({
    label: typeBin.label,
    count: typeBin.count,
    typeSegments: typeBin.segments,
    typeHeight: typeBin.height,
  }));

  return (
    <div className="space-y-1.5">
      {showLegend ? (
        <div className="h-[22px] overflow-hidden">
          <div className="flex flex-wrap items-start gap-x-3 gap-y-1 text-[13px] text-text-secondary">
            <div className="inline-flex flex-wrap items-center gap-1">
              <span className="font-medium uppercase tracking-[0.08em] text-text-muted">card type</span>
              {typeCurve[0]?.segments.map((segment) => (
                <span key={segment.key} className="inline-flex items-center gap-1">
                  <span className={`h-2 w-2 ${segment.colorClass}`} />
                  <span>{segment.label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div aria-hidden="true" className="h-[22px]" />
      )}
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
            {curveTooltip.costLabel} Cost {curveTooltip.segmentLabel === "0" ? "Brick" : curveTooltip.segmentLabel}: {curveTooltip.count}
          </ChartTooltip>
        )}
        <div className="grid grid-cols-11 gap-2">
          {bins.map(({ label, count, typeSegments, typeHeight }) => (
            <div key={label} className="grid min-w-0 grid-rows-[14px_105px_14px] items-end gap-1">
              <span className="text-center text-[13px] font-semibold leading-none text-text-primary">
                {count > 0 ? count : ""}
              </span>
              <div
                className="mx-auto grid h-[105px] w-[64%] grid-cols-1 gap-px overflow-hidden border border-border/40 bg-border/40"
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
                            title={`${label} cost ${segment.label}: ${segment.count}`}
                            aria-label={`${label} cost ${segment.label}: ${segment.count}`}
                          />
                        ))}
                    </div>
                  </div>
                </div>
              </div>
              <span className="text-center text-[13px] tracking-[0.04em] text-text-secondary">
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
            {(tooltip.label === "0" ? "Brick" : tooltip.label)} Counter: {tooltip.count}
          </ChartTooltip>
        )}
      <div className="grid grid-cols-3 gap-2">
        {bars.map((bar) => (
          <div key={bar.label} className="grid min-w-0 grid-rows-[14px_105px_14px] items-end gap-1">
            <span className="text-center text-[13px] font-semibold leading-none text-text-primary">
              {bar.count > 0 ? bar.count : ""}
            </span>
            <div className="flex h-[105px] items-end justify-center">
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
            <span className="text-center text-[13px] tracking-[0.04em] text-text-secondary">
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
  showLegend = true,
}: {
  counts: Array<{ type: string; count: number }>;
  showLegend?: boolean;
}) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    count: number;
  } | null>(null);
  const { total, slices } = buildTypePieSlices(counts);
  if (total <= 0) return null;

  const gradient = `conic-gradient(${slices.map((slice) => {
    const start = slice.offset * 360;
    const end = (slice.offset + slice.size) * 360;
    return `${slice.color} ${start}deg ${end}deg`;
  }).join(", ")})`;

  return (
    <div
      className={showLegend ? "grid gap-4 sm:grid-cols-[128px_minmax(0,1fr)] sm:items-start" : "flex h-full min-h-[133px] items-center justify-center"}
      onMouseLeave={() => setTooltip(null)}
    >
      <div className="relative mx-auto h-[144px] w-[144px] self-center justify-self-center">
        {tooltip && (
          <ChartTooltip
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, calc(-100% - 6px))",
            }}
          >
            {tooltip.label}: {tooltip.count} • {Math.round((tooltip.count / total) * 100)}%
          </ChartTooltip>
        )}
        <div
          className="h-full w-full rounded-full border border-border/50"
          style={{ background: gradient }}
        />
        <svg viewBox="0 0 144 144" className="absolute inset-0 h-full w-full overflow-visible">
          {slices.map((slice) => {
            const startAngle = (slice.offset * 360) - 90;
            const endAngle = ((slice.offset + slice.size) * 360) - 90;
            return (
              <path
                key={slice.type}
                d={describePieSlice(72, 72, 61, startAngle, endAngle)}
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
      {showLegend && (
        <div className="max-h-[140px] overflow-y-auto pl-2 pr-1">
          <div className="space-y-1">
            {slices.map((slice) => (
              <button
                key={slice.type}
                type="button"
                className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-2 border border-border/60 bg-bg-tertiary/14 px-1.5 py-0.5 text-[13px] text-text-secondary"
                title={`${slice.type}: ${slice.count}`}
                onMouseEnter={(event) => {
                  const rect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                  const currentRect = event.currentTarget.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({
                    x: currentRect.left - rect.left + (currentRect.width / 2),
                    y: currentRect.top - rect.top,
                    label: slice.type,
                    count: slice.count,
                  });
                }}
                onMouseMove={(event) => {
                  const rect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                  const currentRect = event.currentTarget.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({
                    x: currentRect.left - rect.left + (currentRect.width / 2),
                    y: currentRect.top - rect.top,
                    label: slice.type,
                    count: slice.count,
                  });
                }}
                onClick={(event) => {
                  const rect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                  const currentRect = event.currentTarget.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({
                    x: currentRect.left - rect.left + (currentRect.width / 2),
                    y: currentRect.top - rect.top,
                    label: slice.type,
                    count: slice.count,
                  });
                }}
                onFocus={(event) => {
                  const rect = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                  const currentRect = event.currentTarget.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({
                    x: currentRect.left - rect.left + (currentRect.width / 2),
                    y: currentRect.top - rect.top,
                    label: slice.type,
                    count: slice.count,
                  });
                }}
              >
                <span className="flex min-w-0 items-center gap-1 overflow-hidden">
                  <span className={`h-1.5 w-1.5 shrink-0 ${slice.dotClass}`} />
                  <span className="min-w-0 truncate text-left">{slice.type}</span>
                </span>
                <span className="w-[3ch] text-right font-medium tabular-nums text-text-primary/90">
                  {slice.count}
                </span>
                <span className="w-[4ch] text-right tabular-nums text-text-secondary">
                  {Math.round((slice.count / total) * 100)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const TYPE_PIE_PALETTE = [
  { color: "rgba(244, 63, 94, 0.9)", dotClass: "bg-[#f43f5e]/90", hue: 345 },
  { color: "rgba(99, 102, 241, 0.9)", dotClass: "bg-[#6366f1]/90", hue: 235 },
  { color: "rgba(249, 115, 22, 0.9)", dotClass: "bg-[#f97316]/90", hue: 25 },
  { color: "rgba(132, 204, 22, 0.9)", dotClass: "bg-[#84cc16]/90", hue: 82 },
  { color: "rgba(168, 85, 247, 0.9)", dotClass: "bg-[#a855f7]/90", hue: 278 },
  { color: "rgba(180, 83, 9, 0.9)", dotClass: "bg-[#b45309]/90", hue: 20 },
  { color: "rgba(168, 162, 158, 0.9)", dotClass: "bg-[#a8a29e]/90", hue: null },
  { color: "rgba(212, 212, 216, 0.9)", dotClass: "bg-[#d4d4d8]/90", hue: null },
];

function buildTypePieSlices(counts: Array<{ type: string; count: number }>) {
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const paletteOrder = buildTypePiePaletteOrder(counts.length);
  let cumulative = 0;

  return {
    total,
    slices: counts.map((item, index) => {
      const start = cumulative / Math.max(1, total);
      cumulative += item.count;
      const end = cumulative / Math.max(1, total);
      return {
        ...item,
        ...(paletteOrder[index] ?? { color: "rgba(203, 213, 225, 0.9)", dotClass: "bg-slate-300/90", hue: null }),
        offset: start,
        size: end - start,
      };
    }),
  };
}

function buildTypePiePaletteOrder(count: number) {
  if (count <= 0) return [];

  const available = [...TYPE_PIE_PALETTE];
  const ordered: typeof TYPE_PIE_PALETTE = [];

  const firstIndex = available.findIndex((entry) => entry.hue !== null);
  ordered.push(available.splice(firstIndex >= 0 ? firstIndex : 0, 1)[0]);

  while (available.length > 0) {
    const previous = ordered[ordered.length - 1];
    const first = ordered[0];
    const remainingAfterPick = ordered.length + 1 === TYPE_PIE_PALETTE.length;

    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    available.forEach((entry, index) => {
      const previousDistance = getHueDistance(previous.hue, entry.hue);
      const wrapDistance = remainingAfterPick ? getHueDistance(first.hue, entry.hue) : previousDistance;
      const neutralPenalty = entry.hue === null ? 18 : 0;
      const score = Math.min(previousDistance, wrapDistance) - neutralPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    ordered.push(available.splice(bestIndex, 1)[0]);
  }

  return Array.from({ length: count }, (_, index) => ordered[index % ordered.length]);
}

function getHueDistance(a: number | null, b: number | null) {
  if (a === null && b === null) return 0;
  if (a === null || b === null) return 140;
  const raw = Math.abs(a - b);
  return Math.min(raw, 360 - raw);
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
  size = "md",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size?: DeckQuantityBadgeSize;
}) {
  const lastActivationRef = useRef(0);
  const sizeClass = size === "lg"
    ? "h-8 w-8 text-sm"
    : size === "sm"
      ? "h-6 w-6 text-[11px]"
      : "h-7 w-7 text-[13px]";
  const iconClass = size === "lg"
    ? "[&>svg]:h-4 [&>svg]:w-4"
    : size === "sm"
      ? "[&>svg]:h-3 [&>svg]:w-3"
      : "[&>svg]:h-3.5 [&>svg]:w-3.5";

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
      className={`flex transform-gpu items-center justify-center rounded-full border border-white/20 bg-black/78 font-semibold text-white shadow-[0_8px_20px_rgba(0,0,0,0.35)] backdrop-blur transition duration-150 hover:scale-[1.08] hover:bg-black/92 active:scale-[0.96] disabled:cursor-not-allowed disabled:border-white/12 disabled:bg-black/58 disabled:text-white/75 disabled:opacity-100 disabled:hover:scale-100 ${sizeClass} ${iconClass}`}
    >
      {children}
    </button>
  );
}

function MagnifierIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

function BarsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20v-12" />
    </svg>
  );
}

function PieIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 9 9h-9Z" />
      <path d="M12 3v9h9" />
    </svg>
  );
}

function ShowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function HideIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.7A3 3 0 0 0 13.4 13.5" />
      <path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-3.2 4.2" />
      <path d="M6.7 6.8A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10.6 10.6 0 0 0 4-.8" />
    </svg>
  );
}

function ClearSearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function SyntaxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 6 3 12l5 6" />
      <path d="m16 6 5 6-5 6" />
      <path d="M14 4 10 20" />
    </svg>
  );
}

function CardPreviewModal({
  card,
  detail,
  isLoading,
  loadError,
  selectedVariantIndex,
  onSelectVariant,
  onAddToDeck,
  onClose,
}: {
  card: Card;
  detail: CardDetail | null;
  isLoading: boolean;
  loadError: string | null;
  selectedVariantIndex?: number;
  onSelectVariant?: (variantIndex?: number) => void;
  onAddToDeck?: (variantIndex?: number) => void;
  onClose: () => void;
}) {
  const selectableVariants = detail?.variants.filter(hasDeckVariantImage) ?? [];
  const selectedVariant = getPreferredDeckVariantFromList(selectableVariants, selectedVariantIndex ?? card.variant_index);
  const [activeVariantIndex, setActiveVariantIndex] = useState<number | undefined>(
    selectedVariant?.variant_index ?? selectedVariantIndex ?? card.variant_index,
  );
  const activeVariant = getPreferredDeckVariantFromList(selectableVariants, activeVariantIndex);
  const imageUrl = activeVariant?.media.scan_url
    ?? activeVariant?.media.image_url
    ?? activeVariant?.media.scan_thumbnail_url
    ?? activeVariant?.media.image_thumb_url
    ?? activeVariant?.media.thumbnail_url
    ?? card.scan_url
    ?? card.image_url
    ?? card.scan_thumb_url
    ?? card.thumbnail_url
    ?? null;
  const fullSizeImageUrl = activeVariant?.media.scan_download_url
    ?? activeVariant?.media.image_url
    ?? activeVariant?.media.scan_url
    ?? activeVariant?.media.image_thumb_url
    ?? activeVariant?.media.scan_thumbnail_url
    ?? activeVariant?.media.thumbnail_url
    ?? card.image_url
    ?? card.scan_url
    ?? card.thumbnail_url
    ?? card.scan_thumb_url
    ?? null;
  const variantSummary = getCardVariantSummary(activeVariant);
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
  const activeVariantLowPrice = activeVariant ? formatDeckVariantPrice(getDeckVariantLowPrice(activeVariant)) : "-";
  const activeVariantMarketPrice = activeVariant ? formatDeckVariantPrice(getDeckVariantMarketPrice(activeVariant)) : "-";
  const activeVariantTcgplayerHref = activeVariant ? buildDeckTcgplayerAffiliateUrl(getDeckVariantTcgplayerUrl(activeVariant)) : null;

  useEffect(() => {
    setActiveVariantIndex(selectedVariant?.variant_index ?? selectedVariantIndex ?? card.variant_index);
  }, [card.variant_index, selectedVariant?.variant_index, selectedVariantIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalSurface
        className="max-h-[92vh] w-full max-w-5xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="hidden absolute right-3 top-3 z-10 h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-lg text-white transition hover:scale-105 hover:border-white/35 hover:bg-black/88 hover:text-white"
        >
          ×
        </button>

        <ModalCloseButton onClose={onClose} />

        <div className="grid max-h-[92vh] overflow-y-auto lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
          <div className="border-b border-border/70 bg-[#0d1015] p-4 lg:border-b-0 lg:border-r">
            <a
              href={fullSizeImageUrl ?? undefined}
              target={fullSizeImageUrl ? "_blank" : undefined}
              rel={fullSizeImageUrl ? "noopener noreferrer" : undefined}
              className={`block overflow-hidden rounded-2xl border border-border/70 bg-black/30 ${fullSizeImageUrl ? "cursor-zoom-in transition hover:opacity-95" : ""}`}
              aria-label={fullSizeImageUrl ? `Open full-size image for ${detail?.name ?? card.name}` : undefined}
            >
              {imageUrl ? (
                <img src={imageUrl} alt={detail?.name ?? card.name} className="block w-full" />
              ) : (
                <div className="aspect-[63/88] flex items-center justify-center px-6 text-center text-sm text-text-muted">
                  No image available
                </div>
              )}
            </a>
            <div className="mt-3 flex justify-center border-t border-border/70 pt-3">
              <Link
                to={`/cards/${detail?.card_number ?? card.card_number}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-link underline-offset-2 hover:text-link-hover hover:underline"
              >
                Open full card page
                <ExternalLinkArrowIcon />
              </Link>
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
                {variantSummary && (
                  <>
                    <InlineDot />
                    <span>{variantSummary}</span>
                  </>
                )}
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

            {detail && selectableVariants.length > 1 && (onSelectVariant || onAddToDeck) && (
              <section className="space-y-3 rounded-2xl border border-border/70 bg-bg-card/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Variant</p>
                    <p className="mt-1 text-sm text-text-secondary">Choose which art this deck entry should use.</p>
                  </div>
                  {onAddToDeck ? (
                    <button
                      type="button"
                      onClick={() => onAddToDeck(activeVariantIndex)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-bg-input/70 px-2.5 py-1.5 text-[11px] font-medium text-text-primary transition hover:bg-bg-hover"
                    >
                      {cardType.toLowerCase() === "leader" ? "Set leader" : "Add this variant"}
                    </button>
                  ) : null}
                </div>
                <div className={getDeckVariantStripContainerClass(selectableVariants.length)}>
                  {selectableVariants.map((variant) => {
                    const variantThumb = getDeckVariantThumbnailUrl(variant);
                    const isActive = variant.variant_index === activeVariant?.variant_index;
                    const variantLabel = variant.label || `Variant ${variant.variant_index}`;
                    const marketLabel = formatDeckVariantPrice(getDeckVariantMarketPrice(variant));
                    const metaLabel = buildDeckVariantMetaLabel(variant);
                    const tcgplayerUrl = buildDeckTcgplayerAffiliateUrl(getDeckVariantTcgplayerUrl(variant));

                    return (
                      <div
                        key={variant.variant_index}
                        className={getDeckVariantStripItemClass(selectableVariants.length)}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveVariantIndex(variant.variant_index);
                            onSelectVariant?.(variant.variant_index);
                          }}
                          className="block w-full text-left"
                          title={variantLabel}
                        >
                          <div
                            className={`overflow-hidden rounded-md border-2 transition-colors ${
                              isActive ? "border-accent" : "border-transparent hover:border-text-muted/40"
                            }`}
                          >
                            {variantThumb ? (
                              <img
                                src={variantThumb}
                                alt={`${detail.name} variant ${variant.variant_index}`}
                                className="block w-full"
                                loading="lazy"
                              />
                            ) : (
                              <div className="aspect-[63/88] flex items-center justify-center bg-bg-tertiary px-2 text-center text-[10px] text-text-muted">
                                {variantLabel}
                              </div>
                            )}
                          </div>
                        </button>
                        <div className="mt-1 px-0.5 text-[10px] leading-tight">
                          {tcgplayerUrl ? (
                            <a
                              href={tcgplayerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block truncate font-medium text-link hover:text-link-hover hover:underline"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {marketLabel}
                            </a>
                          ) : (
                            <p className="truncate font-medium text-text-primary">{marketLabel}</p>
                          )}
                          <p className="truncate text-text-muted">{metaLabel}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {activeVariant && (
              <section className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-bg-card/45 px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted">Market</span>
                <span className="text-sm text-text-secondary">Low</span>
                <span className="text-sm font-medium text-text-primary">{activeVariantLowPrice}</span>
                <InlineDot />
                <span className="text-sm text-text-secondary">Market</span>
                <span className="text-sm font-medium text-text-primary">{activeVariantMarketPrice}</span>
                <InlineDot />
                {activeVariantTcgplayerHref ? (
                  <a
                    href={activeVariantTcgplayerHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-link hover:text-link-hover hover:underline"
                  >
                    Buy on TCGplayer
                  </a>
                ) : (
                  <span className="text-sm text-text-secondary">No TCGplayer listing</span>
                )}
              </section>
            )}

          </div>
        </div>
      </ModalSurface>
    </ModalBackdrop>
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
  const previewImage = getPreferredDeckImage(card, entry.variant_index);
  const variantSummary = getCardVariantSummary(getPreferredDeckVariant(card, entry.variant_index));
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
        {variantSummary ? <p className="truncate text-[10px] text-text-secondary">{variantSummary}</p> : null}
        {card?.power != null && <p className="truncate text-[10px] text-text-secondary">Power {card.power}</p>}
        {card?.counter != null && <p className="truncate text-[10px] text-text-secondary">Counter +{card.counter}</p>}
      </div>

      {readOnly ? (
        <div className="flex min-w-[34px] items-center justify-center pr-1 text-center text-xs font-semibold text-text-primary">
          x{entry.count}
        </div>
      ) : forceStaticCount ? (
        <div className="grid grid-cols-[auto_auto] items-center gap-1 pr-1">
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
        <div className="grid grid-cols-[auto_auto] items-center gap-1 pr-1">
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
      className={`flex h-6 w-6 transform-gpu items-center justify-center rounded-md border text-sm transition duration-150 hover:scale-[1.08] active:scale-[0.96] disabled:cursor-default disabled:opacity-40 disabled:hover:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}

function getPreferredDeckVariant(card?: CardDetail | null, variantIndex?: number) {
  if (!card?.variants?.length) return null;
  return card.variants.find((variant) => variant.variant_index === variantIndex) ?? card.variants[0] ?? null;
}

function getPreferredDeckVariantFromList(variants: CardVariant[], variantIndex?: number) {
  if (variants.length === 0) return null;
  return variants.find((variant) => variant.variant_index === variantIndex) ?? variants[0] ?? null;
}

function hasDeckVariantImage(variant: CardVariant) {
  return Boolean(
    variant.media.scan_url
    ?? variant.media.scan_thumbnail_url
    ?? variant.media.scan_download_url
    ?? variant.media.image_url
    ?? variant.media.image_thumb_url
    ?? variant.media.thumbnail_url,
  );
}

function formatDeckVariantPrice(val: string | null) {
  if (!val) return "-";
  return `$${parseFloat(val).toFixed(2)}`;
}

function getDeckVariantMarketPrice(variant: CardVariant): string | null {
  const firstPrice = Object.values(variant.market.prices)[0];
  return firstPrice?.market_price ?? null;
}

function getDeckVariantLowPrice(variant: CardVariant): string | null {
  const firstPrice = Object.values(variant.market.prices)[0];
  return firstPrice?.low_price ?? null;
}

function getDeckVariantTcgplayerUrl(variant: CardVariant): string | null {
  const firstPrice = Object.values(variant.market.prices)[0];
  return firstPrice?.tcgplayer_url ?? variant.market.tcgplayer_url ?? null;
}

function buildDeckTcgplayerAffiliateUrl(href: string | null): string | null {
  if (!href) return null;

  try {
    const targetUrl = new URL(href);
    if (targetUrl.hostname === "partner.tcgplayer.com") {
      return href;
    }

    const affiliateUrl = new URL(TCGPLAYER_AFFILIATE_BASE_URL);
    affiliateUrl.searchParams.set("u", targetUrl.toString());
    return affiliateUrl.toString();
  } catch {
    return href;
  }
}

function getDeckVariantThumbnailUrl(variant: CardVariant) {
  return variant.media.scan_thumbnail_url
    ?? variant.media.scan_url
    ?? variant.media.thumbnail_url
    ?? variant.media.image_url
    ?? null;
}

function getDeckVariantStripContainerClass(count: number): string {
  if (count >= 4) return "flex gap-1.25 overflow-x-auto pb-1";
  if (count >= 2) return "grid grid-cols-7 gap-1";
  return "grid grid-cols-1 gap-1.5";
}

function getDeckVariantStripItemClass(count: number): string {
  if (count >= 4) {
    return "w-[calc((100%-1rem)/7)] min-w-[calc((100%-1rem)/7)] shrink-0";
  }
  return "min-w-0";
}

function getReadOnlyDeckGridClass(size: DeckViewerCardSize, overview: boolean) {
  if (overview) {
    switch (size) {
      case "sm":
        return "grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10";
      case "lg":
        return "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
      case "md":
      default:
        return "grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7";
    }
  }

  switch (size) {
    case "sm":
      return "grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6";
    case "lg":
      return "grid grid-cols-2 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3";
    case "md":
    default:
      return "grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4";
  }
}

function getReadOnlyDeckTileClass(size: DeckViewerCardSize, compact: boolean) {
  if (compact) return "min-w-0";

  switch (size) {
    case "sm":
      return "max-w-[10rem]";
    case "lg":
      return "max-w-[14rem]";
    case "md":
    default:
      return "max-w-[12rem]";
  }
}

function getReadOnlyDeckTilePreviewPositionClass(size: DeckViewerCardSize, compact: boolean) {
  if (compact && size === "sm") return "left-1 top-1";
  if (compact || size === "sm") return "left-1.5 top-1.5";
  if (size === "lg") return "left-2.5 top-2.5";
  return "left-2 top-2";
}

function getReadOnlyDeckTileOverlayPaddingClass(size: DeckViewerCardSize, compact: boolean) {
  if (compact && size === "sm") return "p-1";
  if (compact || size === "sm") return "p-1.5";
  if (size === "lg") return "p-2.5";
  return "p-2";
}

function getDeckQuantityBadgeClass(size: DeckQuantityBadgeSize, compact = false) {
  if (size === "lg") {
    return "rounded-md border border-white/20 bg-accent px-2.5 py-1.5 text-[16px] font-black leading-none text-bg-primary shadow-[0_6px_16px_rgba(0,0,0,0.4)]";
  }

  if (size === "sm") {
    return compact
      ? "rounded-md border border-white/20 bg-accent px-1.25 py-0.5 text-[10px] font-black leading-none text-bg-primary shadow-[0_6px_16px_rgba(0,0,0,0.4)]"
      : "rounded-md border border-white/20 bg-accent px-1.5 py-0.75 text-[11px] font-black leading-none text-bg-primary shadow-[0_6px_16px_rgba(0,0,0,0.4)]";
  }

  return compact
    ? "rounded-md border border-white/20 bg-accent px-2 py-1 text-[13px] font-black leading-none text-bg-primary shadow-[0_6px_16px_rgba(0,0,0,0.4)]"
    : "rounded-md border border-white/20 bg-accent px-2.25 py-1.25 text-[15px] font-black leading-none text-bg-primary shadow-[0_6px_16px_rgba(0,0,0,0.4)]";
}

function DeckQuantityBadge({
  label,
  size,
  compact = false,
}: {
  label: string;
  size: DeckQuantityBadgeSize;
  compact?: boolean;
}) {
  return <span className={getDeckQuantityBadgeClass(size, compact)}>{label}</span>;
}

function abbreviateDeckVariantLabel(label: string): string {
  const words = label.match(/[A-Za-z0-9]+/g) ?? [];
  if (words.length <= 1) return label;
  return words.map((word) => word[0]?.toUpperCase() ?? "").join("");
}

function buildDeckVariantMetaLabel(variant: CardVariant) {
  const variantLabel = variant.label || `Variant ${variant.variant_index}`;
  const shortLabel = abbreviateDeckVariantLabel(variantLabel);
  return variant.product.set_code
    ? `${shortLabel} (${variant.product.set_code})`
    : shortLabel;
}

function getCardVariantSummary(variant?: CardVariant | null) {
  if (!variant) return "";

  const parts = [variant.label, variant.product.name]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return [...new Set(parts)].join(" · ");
}

function getPreferredDeckImage(card?: CardDetail, variantIndex?: number) {
  const variant = getPreferredDeckVariant(card, variantIndex);
  return variant?.media.scan_thumbnail_url
    ?? variant?.media.scan_url
    ?? variant?.media.thumbnail_url
    ?? variant?.media.image_url
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
      return "border-black/60 bg-black";
    case "blue":
      return "border-sky-300/25 bg-sky-700";
    case "green":
      return "border-emerald-300/25 bg-emerald-700";
    case "purple":
      return "border-violet-300/20 bg-violet-800";
    case "red":
      return "border-rose-300/25 bg-rose-700";
    case "yellow":
      return "border-yellow-200/40 bg-yellow-500 text-slate-950";
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
  disabled = false,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "neutral" | "danger";
  disabled?: boolean;
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
        disabled={disabled}
        className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${className} ${disabled ? "cursor-default opacity-35 hover:bg-inherit" : ""}`}
      >
        {children}
      </button>
      <span className={`pointer-events-none absolute right-0 top-full mt-1 whitespace-nowrap rounded-md border border-border/70 bg-bg-primary/95 px-2 py-1 text-[10px] font-medium text-text-secondary shadow-md transition-opacity ${disabled ? "opacity-0" : "opacity-0 group-hover:opacity-100"}`}>
        {label}
      </span>
    </div>
  );
}

function LegalCheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4" />
    </svg>
  );
}

function IllegalXIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4 12 12M12 4 4 12" />
    </svg>
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

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h9a7 7 0 1 1 0 14h-1" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9h-9a7 7 0 1 0 0 14h1" />
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
    <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 ${toneClass}`}>
      <span className="text-[10px] uppercase tracking-[0.12em]">{label}</span>
      <span className="font-semibold text-text-primary">{value}</span>
    </div>
  );
}

function LegalityPill({ result }: { result: FormatLegalityResult }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const tooltipText = result.legal
    ? `Legal in ${result.format}`
    : result.reasons.join("\n");

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 ${
        result.legal
          ? "border-legal/25 bg-legal/8 text-legal"
          : "border-banned/25 bg-banned/8 text-[#f2c1c1]"
      }`}>
        <span className="text-[10px] uppercase tracking-[0.12em]">{result.format}</span>
        {result.legal ? <LegalCheckIcon /> : <IllegalXIcon />}
      </div>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-pre rounded-lg border border-border/80 bg-bg-primary px-3 py-2 text-[11px] text-text-primary shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
          {tooltipText}
        </div>
      )}
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

type FormatLegalityResult = {
  format: string;
  legal: boolean;
  reasons: string[];
};

function buildDeckLegality(
  deck: Deck,
  cardsByNumber: Record<string, CardDetail>,
  formatNames: string[],
): FormatLegalityResult[] {
  const allEntries: { card_number: string; count: number }[] = [
    ...(deck.leader ? [{ card_number: deck.leader.card_number, count: 1 }] : []),
    ...deck.main,
  ];

  const mainCount = deck.main.reduce((sum, e) => sum + e.count, 0);

  return formatNames.map((format) => {
    const reasons: string[] = [];

    if (!deck.leader) {
      reasons.push("No leader selected");
    }
    if (mainCount !== 50) {
      reasons.push(`Main deck has ${mainCount} cards (must be exactly 50)`);
    }

    for (const entry of allEntries) {
      const card = cardsByNumber[entry.card_number];
      if (!card) continue;

      const legality = card.legality?.[format];
      if (!legality) continue;

      if (legality.status === "banned") {
        reasons.push(`${card.card_number} is banned`);
      } else if (legality.status === "restricted") {
        const maxCopies = legality.max_copies ?? 1;
        if (entry.count > maxCopies) {
          reasons.push(`${card.card_number} is restricted to ${maxCopies} ${maxCopies === 1 ? "copy" : "copies"}`);
        }
      } else if (legality.status === "pair") {
        const partners = legality.paired_with ?? [];
        for (const partner of partners) {
          const partnerInDeck = allEntries.some((e) => e.card_number === partner);
          if (partnerInDeck) {
            reasons.push(`${card.card_number} cannot be used with ${partner}`);
          }
        }
      }
    }

    return { format, legal: reasons.length === 0, reasons };
  });
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
  const normalizedSyntaxTokens = syntaxTokens.map((token) => token.trim()).filter(Boolean);

  if (normalizedSyntaxTokens.length === 0) {
    return plainText;
  }

  const normalizedPlainText = plainText.replace(/\s+/g, " ").trimStart();
  const syntaxQuery = normalizedSyntaxTokens.join(" ");

  if (normalizedPlainText.length === 0) {
    return `${syntaxQuery} `;
  }

  return `${syntaxQuery} ${normalizedPlainText}`;
}

function isSameDeckState(left: Deck, right: Deck) {
  return JSON.stringify(normalizeDeckForComparison(left)) === JSON.stringify(normalizeDeckForComparison(right));
}

function normalizeDeckForComparison(deck: Deck) {
  const normalizeEntry = (entry: DeckEntry | null) => entry
    ? {
        card_number: entry.card_number.toUpperCase(),
        count: entry.count,
        ...(entry.variant_index != null ? { variant_index: entry.variant_index } : {}),
      }
    : null;

  return {
    leader: normalizeEntry(deck.leader),
    don: normalizeEntry(deck.don),
    format: deck.format ?? null,
    main: [...deck.main]
      .map((entry) => normalizeEntry(entry)!)
      .sort((a, b) => a.card_number.localeCompare(b.card_number, undefined, { numeric: true })),
  };
}

function parseSearchQuery(query: string) {
  const normalized = query.replace(/\s+/g, " ");
  const hasTrailingWhitespace = /\s$/.test(query);
  const parts = tokenizeSearchQuery(normalized);

  const syntaxTokens: string[] = [];
  const plainTokens: string[] = [];
  let hasTrailingPlainWhitespace = false;

  parts.forEach((token, index) => {
    const isLastToken = index === parts.length - 1;
    const isCommitted = !isLastToken || hasTrailingWhitespace;
    const isSyntaxToken = isCommitted && isAdvancedSearchSyntaxToken(token);

    if (isSyntaxToken) {
      syntaxTokens.push(token);
      return;
    }

    plainTokens.push(token);
    if (isLastToken && hasTrailingWhitespace) {
      hasTrailingPlainWhitespace = true;
    }
  });

  return {
    syntaxTokens,
    plainText: `${plainTokens.join(" ")}${hasTrailingPlainWhitespace && plainTokens.length > 0 ? " " : ""}`,
  };
}

const SEARCH_FIELD_ALIASES: Record<string, string> = {
  n: "name",
  name: "name",
  c: "color",
  color: "color",
  t: "type",
  type: "type",
  cost: "cost",
  p: "power",
  pow: "power",
  power: "power",
  life: "life",
  counter: "counter",
  r: "rarity",
  rarity: "rarity",
  artist: "artist",
  text: "text",
  any: "text",
  o: "effect",
  effect: "effect",
  trigger: "trigger",
  trait: "trait",
  tr: "trait",
  a: "attribute",
  attribute: "attribute",
  block: "block",
  set: "set",
  product: "product",
  legal: "legal",
  banned: "banned",
  is: "is",
  not: "not",
  has: "has",
  usd: "usd",
  year: "year",
  date: "date",
  new: "new",
  prints: "prints",
  order: "order",
  sort: "order",
  dir: "direction",
  direction: "direction",
  card_number: "card_number",
};

const SEARCH_OPERATOR_PATTERN = /^(>=|<=|!=|>|<|=|:)/;
const IMPLICIT_CARD_NUMBER_PATTERN = /^(?:(?:OP\d{2}|ST\d{2}|EB\d{2}|PRB\d{2})-\d{3}|P-\d{3})$/i;
const IMPLICIT_SET_CODE_PATTERN = /^(?:OP\d{2}|ST\d{2}|EB\d{2}|PRB\d{2}|P\d{2,3})$/i;

function tokenizeSearchQuery(input: string) {
  const tokens: string[] = [];
  let index = 0;

  while (index < input.length) {
    if (input[index] === " " || input[index] === "\t") {
      index++;
      continue;
    }

    if (input[index] === "(" || input[index] === ")") {
      tokens.push(input[index]);
      index++;
      continue;
    }

    if (input[index] === '"') {
      let end = index + 1;
      while (end < input.length && input[end] !== '"') end++;
      tokens.push(input.slice(index, Math.min(end + 1, input.length)));
      index = Math.min(end + 1, input.length);
      continue;
    }

    let end = index;
    while (end < input.length && input[end] !== " " && input[end] !== "\t" && input[end] !== "(" && input[end] !== ")") {
      if (input[end] === '"') {
        end++;
        while (end < input.length && input[end] !== '"') end++;
        if (end < input.length) end++;
        break;
      }
      end++;
    }

    tokens.push(input.slice(index, end));
    index = end;
  }

  return tokens.filter(Boolean);
}

function isAdvancedSearchSyntaxToken(token: string) {
  if (!token || token === "(" || token === ")") return false;
  if (/^(OR|NOT)$/i.test(token)) return false;
  if (token.startsWith('"') && token.endsWith('"')) return false;

  const normalizedToken = token.startsWith("-") ? token.slice(1) : token;
  if (!normalizedToken) return false;

  if (IMPLICIT_CARD_NUMBER_PATTERN.test(normalizedToken) || IMPLICIT_SET_CODE_PATTERN.test(normalizedToken)) {
    return true;
  }

  const lowerToken = normalizedToken.toLowerCase();
  for (const alias of Object.keys(SEARCH_FIELD_ALIASES)) {
    if (!lowerToken.startsWith(alias)) continue;

    const remainder = normalizedToken.slice(alias.length);
    const operatorMatch = remainder.match(SEARCH_OPERATOR_PATTERN);
    if (!operatorMatch) continue;

    const value = remainder.slice(operatorMatch[1].length);
    if (!value) continue;

    if (value.startsWith('"') && !value.endsWith('"')) {
      return false;
    }

    return true;
  }

  return false;
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

function buildDeckTraitCounts(deck: Deck, cardsByNumber: Record<string, CardDetail>) {
  const counts = new Map<string, number>();

  for (const entry of deck.main) {
    const card = cardsByNumber[entry.card_number];
    if (!card || !Array.isArray(card.types)) continue;

    const traitLabel = formatTraitComboLabel(card.types);
    if (!traitLabel) continue;

    counts.set(traitLabel, (counts.get(traitLabel) ?? 0) + entry.count);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([type, count]) => ({ type, count }));
}

function formatTraitComboLabel(types: string[]) {
  const uniqueTypes = [
    ...new Set(
      types
        .map((type) => type.trim())
        .filter(Boolean),
    ),
  ];

  if (uniqueTypes.length === 0) return "";
  return uniqueTypes.join(" / ");
}

function buildDeckCurve(
  deck: Deck,
  cardsByNumber: Record<string, CardDetail>,
  mode: "type" | "counter" | "trait",
  traitSlices: TypePieSlice[] = [],
) {
  const bins = [
    { label: "0", min: 0, max: 0, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0, traits: new Map<string, number>() },
    { label: "1", min: 1, max: 1, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0, traits: new Map<string, number>() },
    { label: "2", min: 2, max: 2, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0, traits: new Map<string, number>() },
    { label: "3", min: 3, max: 3, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0, traits: new Map<string, number>() },
    { label: "4", min: 4, max: 4, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0, traits: new Map<string, number>() },
    { label: "5", min: 5, max: 5, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0, traits: new Map<string, number>() },
    { label: "6", min: 6, max: 6, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0, traits: new Map<string, number>() },
    { label: "7", min: 7, max: 7, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0, traits: new Map<string, number>() },
    { label: "8", min: 8, max: 8, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0, traits: new Map<string, number>() },
    { label: "9", min: 9, max: 9, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0, traits: new Map<string, number>() },
    { label: "10", min: 10, max: Number.POSITIVE_INFINITY, count: 0, character: 0, event: 0, stage: 0, counter0: 0, counter1k: 0, counter2k: 0, traits: new Map<string, number>() },
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

      if (Array.isArray(card.types)) {
        const traitLabel = formatTraitComboLabel(card.types);
        if (traitLabel) {
          bin.traits.set(traitLabel, (bin.traits.get(traitLabel) ?? 0) + entry.count);
        }
      }
    }
  }

  const maxCount = Math.max(1, ...bins.map((bin) => bin.count));
  return bins.map((bin) => {
    const traitColorMap = new Map(traitSlices.map((slice) => [slice.type, slice.dotClass]));
    const segments = mode === "counter"
      ? [
          { key: "counter0", label: "0", count: bin.counter0, colorClass: "bg-slate-400/80" },
          { key: "counter1k", label: "1k", count: bin.counter1k, colorClass: "bg-sky-400/80" },
          { key: "counter2k", label: "2k", count: bin.counter2k, colorClass: "bg-amber-300/85" },
        ]
      : mode === "type"
        ? [
          { key: "character", label: "Character", count: bin.character, colorClass: "bg-emerald-400/80" },
          { key: "event", label: "Event", count: bin.event, colorClass: "bg-fuchsia-400/80" },
          { key: "stage", label: "Stage", count: bin.stage, colorClass: "bg-cyan-300/85" },
        ]
        : traitSlices.map((slice) => ({
          key: `trait-${slice.type}`,
          label: slice.type,
          count: bin.traits.get(slice.type) ?? 0,
          colorClass: traitColorMap.get(slice.type) ?? "bg-slate-300/85",
        }));

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
