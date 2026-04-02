import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCardsBatch } from "../api/hooks";
import type { CardDetail } from "../api/types";
import { DEFAULT_PAGE_CONTAINER_CLASS } from "../components/layout/container";
import { createEmptyDeck, deckHashToEditPath, deckHashToViewPath, encodeDeckHash } from "../decks/hash";
import {
  createSavedDeckRecord,
  deleteSavedDeckRecord,
  listSavedDecks,
  renameSavedDeckRecord,
  toggleFavoriteSavedDeckRecord,
  type SavedDeckRecord,
} from "../decks/library";
import { usePageMeta } from "../hooks/usePageMeta";

export function DeckLibraryPage() {
  const navigate = useNavigate();
  const [savedDecks, setSavedDecks] = useState<SavedDeckRecord[]>(() => listSavedDecks());
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deckPendingDelete, setDeckPendingDelete] = useState<SavedDeckRecord | null>(null);

  const leaderCardNumbers = useMemo(
    () => [...new Set(savedDecks.map((deck) => deck.leaderCardNumber).filter((value): value is string => Boolean(value)))],
    [savedDecks],
  );
  const leadersQuery = useCardsBatch(leaderCardNumbers);
  const leadersByNumber = leadersQuery.data?.data ?? {};

  usePageMeta({
    title: "Decks",
    description: "Open a saved local deck or start a new One Piece Card Game deck.",
    url: "/decks",
  });

  async function handleCreateDeck() {
    setIsCreating(true);
    setCreateError(null);

    try {
      const deck = createEmptyDeck();
      const hash = await encodeDeckHash(deck);
      const savedDeck = createSavedDeckRecord(hash, deck);
      setSavedDecks((current) => [savedDeck, ...current.filter((entry) => entry.id !== savedDeck.id)]);
      navigate(deckHashToEditPath(hash, savedDeck.id));
    } catch (error: unknown) {
      setCreateError(error instanceof Error ? error.message : "Could not create a new deck.");
    } finally {
      setIsCreating(false);
    }
  }

  function handleDeleteDeck(id: string) {
    deleteSavedDeckRecord(id);
    setSavedDecks(listSavedDecks().filter((entry) => entry.id !== id));
  }

  function handleRenameDeck(id: string, localName: string | null) {
    renameSavedDeckRecord(id, localName);
    setSavedDecks(listSavedDecks());
  }

  function handleToggleFavorite(id: string) {
    toggleFavoriteSavedDeckRecord(id);
    setSavedDecks(listSavedDecks());
  }

  return (
    <div className={`${DEFAULT_PAGE_CONTAINER_CLASS} py-3 space-y-4`}>
      <section className="rounded-xl border border-border/70 bg-bg-card/75 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Decks</p>
            <h1 className="text-xl font-bold text-text-primary">Local Deck Library</h1>
            <p className="text-sm text-text-secondary">Pick up a saved deck or make a new one.</p>
          </div>

          <HoverLabelIconButton
            label={isCreating ? "creating" : "new deck"}
            onClick={handleCreateDeck}
            disabled={isCreating}
            className="bg-accent text-bg-primary hover:bg-accent-hover"
          >
            {isCreating ? "…" : <CreateDeckIcon />}
          </HoverLabelIconButton>
        </div>
        {createError && (
          <p className="mt-2 text-sm text-banned">{createError}</p>
        )}
      </section>

      {savedDecks.length === 0 ? (
        <section className="rounded-xl border border-border/70 bg-bg-card/70 px-4 py-8 text-center text-sm text-text-secondary">
          No saved decks yet.
        </section>
      ) : (
        <section className="space-y-2">
          {savedDecks.map((savedDeck) => {
            const leader = savedDeck.leaderCardNumber ? leadersByNumber[savedDeck.leaderCardNumber] : null;
            return (
              <SavedDeckRow
                key={savedDeck.id}
                savedDeck={savedDeck}
                leader={leader}
                onRename={handleRenameDeck}
                onToggleFavorite={handleToggleFavorite}
                onDelete={() => setDeckPendingDelete(savedDeck)}
              />
            );
          })}
        </section>
      )}

      {deckPendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4"
          onClick={() => setDeckPendingDelete(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border/80 bg-bg-card/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Delete Deck</p>
              <h2 className="text-lg font-semibold text-text-primary">Are you sure?</h2>
              <p className="text-sm text-text-secondary">
                This cannot be undone. The saved local deck will be removed from this browser.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeckPendingDelete(null)}
                className="inline-flex h-9 items-center rounded-lg border border-border bg-bg-tertiary/20 px-3 text-sm font-medium text-text-primary transition hover:bg-bg-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteDeck(deckPendingDelete.id);
                  setDeckPendingDelete(null);
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-banned/10 px-3 text-sm font-medium text-banned transition hover:bg-banned/15"
              >
                <TrashIcon />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SavedDeckRow({
  savedDeck,
  leader,
  onRename,
  onToggleFavorite,
  onDelete,
}: {
  savedDeck: SavedDeckRecord;
  leader?: CardDetail | null;
  onRename: (id: string, localName: string | null) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState(savedDeck.localName ?? "");
  const imageUrl = leader?.variants[0]?.media.thumbnail_url
    ?? leader?.variants[0]?.media.image_url
    ?? null;
  const fallbackTitle = leader
    ? `${leader.card_number.split("-")[0]} ${leader.name}`
    : "Untitled deck";
  const title = savedDeck.localName?.trim() || fallbackTitle;

  function commitRename() {
    const normalized = draftName.trim();
    onRename(savedDeck.id, normalized.length > 0 ? normalized : null);
    setDraftName(normalized);
    setIsRenaming(false);
  }

  return (
    <article className="grid gap-4 rounded-xl border border-border/70 bg-bg-card/70 p-3 sm:grid-cols-[108px_minmax(0,1fr)_auto] sm:items-center">
      <div className="h-[68px] w-[108px] overflow-hidden rounded-[3px] bg-bg-tertiary/40">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={leader?.name ?? title}
            className="block h-full w-full scale-[1.2] object-cover object-[50%_14%]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-[10px] text-text-muted">
            {leader?.card_number ?? "Deck"}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {isRenaming ? (
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitRename();
                  } else if (event.key === "Escape") {
                    setDraftName(savedDeck.localName ?? "");
                    setIsRenaming(false);
                  }
                }}
                autoFocus
                className="h-8 w-full rounded-lg border border-border bg-bg-input px-2 text-sm font-semibold text-text-primary outline-none"
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="min-w-0 truncate text-sm font-semibold text-text-primary">{title}</div>
                <HoverLabelIconButton
                  label="rename"
                  onClick={() => setIsRenaming(true)}
                  className="h-6 w-6 border-border bg-bg-tertiary/20 text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                >
                  <EditIcon />
                </HoverLabelIconButton>
              </div>
            )}
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary">
          <span>{savedDeck.mainCount}/50 cards</span>
          {leader?.card_type && <span>{leader.card_type}</span>}
          <span>updated {formatDeckTimestamp(savedDeck.updatedAt)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
        <HoverLabelIconButton
          label={savedDeck.favorite ? "unfavorite" : "favorite"}
          onClick={() => onToggleFavorite(savedDeck.id)}
          className={savedDeck.favorite
            ? "border-amber-300/50 bg-amber-300/12 text-amber-200 hover:bg-amber-300/18"
            : "border-border bg-bg-tertiary/20 text-text-primary hover:bg-bg-hover"}
        >
          <FavoriteIcon filled={savedDeck.favorite} />
        </HoverLabelIconButton>
        <Link
          to={deckHashToEditPath(savedDeck.hash, savedDeck.id)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-bg-tertiary/20 px-3 text-[11px] font-medium text-text-primary hover:bg-bg-hover hover:no-underline"
        >
          <EditIcon />
          Edit
        </Link>
        <Link
          to={deckHashToViewPath(savedDeck.hash, savedDeck.id)}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-bg-tertiary/20 px-3 text-[11px] font-medium text-text-primary hover:bg-bg-hover hover:no-underline"
        >
          <ViewIcon />
          View
        </Link>
        <HoverLabelIconButton
          label="delete"
          onClick={onDelete}
          className="border-border bg-bg-tertiary/12 text-banned hover:bg-banned/10"
        >
          <TrashIcon />
        </HoverLabelIconButton>
      </div>
    </article>
  );
}

function HoverLabelIconButton({
  children,
  label,
  onClick,
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        {children}
      </button>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border/70 bg-bg-primary/96 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.04em] text-text-primary shadow-[0_10px_24px_rgba(0,0,0,0.35)] group-hover:block">
        {label}
      </div>
    </div>
  );
}

function FavoriteIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 17.27 6.18 3.73-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}

function CreateDeckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function formatDeckTimestamp(value: number) {
  const diffMs = Date.now() - value;
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
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

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20l-5 1 1-5 12.5-12.5Z" />
    </svg>
  );
}
