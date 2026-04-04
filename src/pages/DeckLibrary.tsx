import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCardsBatch } from "../api/hooks";
import type { CardDetail } from "../api/types";
import { DeckPageLoadingState } from "../components/deck/DeckPageLoadingState";
import { ActionModal } from "../components/Modal";
import { DEFAULT_PAGE_CONTAINER_CLASS } from "../components/layout/container";
import { createEmptyDeck, deckHashToEditPath, deckHashToViewPath, encodeDeckHash } from "../decks/hash";
import {
  assignSavedDeckRecordFolder,
  assignSavedDeckRecordsFolder,
  cleanupEmptySavedDeckRecords,
  createSavedDeckFolder,
  createSavedDeckRecord,
  deleteSavedDeckFolder,
  deleteSavedDeckRecord,
  deleteSavedDeckRecords,
  listSavedDeckFolders,
  listSavedDecks,
  renameSavedDeckFolder,
  renameSavedDeckRecord,
  toggleFavoriteSavedDeckFolder,
  toggleFavoriteSavedDeckRecord,
  type SavedDeckFolder,
  type SavedDeckRecord,
} from "../decks/library";
import { usePageMeta } from "../hooks/usePageMeta";

type DeckLibraryFilter =
  | { kind: "all" }
  | { kind: "favorites" }
  | { kind: "unfiled" }
  | { kind: "folder"; folderId: string };

const NO_FOLDER_VALUE = "__no_folder__";

function getInitialSavedDecks() {
  cleanupEmptySavedDeckRecords();
  return listSavedDecks();
}

export function DeckLibraryPage() {
  const navigate = useNavigate();
  const [savedDecks, setSavedDecks] = useState<SavedDeckRecord[]>(() => getInitialSavedDecks());
  const [folders, setFolders] = useState<SavedDeckFolder[]>(() => listSavedDeckFolders());
  const [selectedFilter, setSelectedFilter] = useState<DeckLibraryFilter>({ kind: "all" });
  const [selectedDeckIds, setSelectedDeckIds] = useState<string[]>([]);
  const [bulkFolderId, setBulkFolderId] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [folderDraftName, setFolderDraftName] = useState("");
  const [folderDraftError, setFolderDraftError] = useState<string | null>(null);
  const [deckPendingDelete, setDeckPendingDelete] = useState<SavedDeckRecord | null>(null);
  const [folderPendingDelete, setFolderPendingDelete] = useState<SavedDeckFolder | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const leaderCardNumbers = useMemo(
    () => [...new Set(savedDecks.map((deck) => deck.leaderCardNumber).filter((value): value is string => Boolean(value)))],
    [savedDecks],
  );
  const leadersQuery = useCardsBatch(leaderCardNumbers);
  const leadersByNumber = leadersQuery.data?.data ?? {};
  const isLibraryLoading = savedDecks.length > 0 && leadersQuery.isLoading && !leadersQuery.data;

  usePageMeta({
    title: "Decks",
    description: "Open a saved local deck or start a new One Piece Card Game deck.",
    url: "/decks",
  });

  const deckCountsByFolderId = useMemo(() => {
    const counts = new Map<string, number>();

    for (const deck of savedDecks) {
      if (!deck.folderId) continue;
      counts.set(deck.folderId, (counts.get(deck.folderId) ?? 0) + 1);
    }

    return counts;
  }, [savedDecks]);

  const favoriteDeckCount = useMemo(
    () => savedDecks.filter((deck) => deck.favorite).length,
    [savedDecks],
  );

  const unfiledDeckCount = useMemo(
    () => savedDecks.filter((deck) => !deck.folderId).length,
    [savedDecks],
  );

  const filteredDecks = useMemo(() => {
    switch (selectedFilter.kind) {
      case "favorites":
        return savedDecks.filter((deck) => deck.favorite);
      case "unfiled":
        return savedDecks.filter((deck) => !deck.folderId);
      case "folder":
        return savedDecks.filter((deck) => deck.folderId === selectedFilter.folderId);
      case "all":
      default:
        return savedDecks;
    }
  }, [savedDecks, selectedFilter]);

  const selectedVisibleDeckIds = useMemo(
    () => filteredDecks.filter((deck) => selectedDeckIds.includes(deck.id)).map((deck) => deck.id),
    [filteredDecks, selectedDeckIds],
  );

  const filterMeta = useMemo(() => {
    if (selectedFilter.kind === "all") {
      return {
        title: "All decks",
        description: "Check decks to move them into folders or delete them in bulk.",
      };
    }

    if (selectedFilter.kind === "favorites") {
      return {
        title: "Favorite decks",
        description: "Your starred decks, regardless of folder.",
      };
    }

    if (selectedFilter.kind === "unfiled") {
      return {
        title: "Unfiled decks",
        description: "Saved decks that are not assigned to a folder yet.",
      };
    }

    const folder = folders.find((entry) => entry.id === selectedFilter.folderId);
    return {
      title: folder?.name ?? "Folder",
      description: "Decks assigned to this folder.",
    };
  }, [folders, selectedFilter]);

  useEffect(() => {
    if (selectedFilter.kind !== "folder") return;
    if (folders.some((folder) => folder.id === selectedFilter.folderId)) return;
    setSelectedFilter({ kind: "all" });
    setSelectedDeckIds([]);
    setBulkFolderId("");
  }, [folders, selectedFilter]);

  useEffect(() => {
    setSelectedDeckIds((current) => current.filter((id) => savedDecks.some((deck) => deck.id === id)));
  }, [savedDecks]);

  if (isLibraryLoading) {
    return (
      <DeckPageLoadingState
        title="Loading deck library"
        description="Fetching saved decks and leader previews."
      />
    );
  }

  function refreshLibrary() {
    const nextDecks = listSavedDecks();
    const nextFolders = listSavedDeckFolders();
    setSavedDecks(nextDecks);
    setFolders(nextFolders);
    setSelectedDeckIds((current) => current.filter((id) => nextDecks.some((deck) => deck.id === id)));
  }

  function setActiveFilter(nextFilter: DeckLibraryFilter) {
    setSelectedFilter(nextFilter);
    setSelectedDeckIds([]);
    setBulkFolderId("");
  }

  async function handleCreateDeck() {
    setIsCreating(true);
    setCreateError(null);

    try {
      const deck = createEmptyDeck();
      const hash = await encodeDeckHash(deck);
      const folderId = selectedFilter.kind === "folder" ? selectedFilter.folderId : null;
      const savedDeck = createSavedDeckRecord(hash, deck, { folderId });
      refreshLibrary();
      navigate(deckHashToEditPath(hash, savedDeck.id));
    } catch (error: unknown) {
      setCreateError(error instanceof Error ? error.message : "Could not create a new deck.");
    } finally {
      setIsCreating(false);
    }
  }

  function handleCreateFolder() {
    const normalizedName = folderDraftName.trim();
    if (!normalizedName) {
      setFolderDraftError("Folder name is required.");
      return;
    }

    try {
      const folder = createSavedDeckFolder(normalizedName);
      refreshLibrary();
      setActiveFilter({ kind: "folder", folderId: folder.id });
      setCreateFolderOpen(false);
      setFolderDraftName("");
      setFolderDraftError(null);
    } catch (error: unknown) {
      setFolderDraftError(error instanceof Error ? error.message : "Could not create folder.");
    }
  }

  function handleDeleteDeck(id: string) {
    deleteSavedDeckRecord(id);
    refreshLibrary();
  }

  function handleDeleteSelectedDecks() {
    deleteSavedDeckRecords(selectedDeckIds);
    refreshLibrary();
    setSelectedDeckIds([]);
    setBulkDeleteOpen(false);
  }

  function handleRenameDeck(id: string, localName: string | null) {
    renameSavedDeckRecord(id, localName);
    refreshLibrary();
  }

  function handleToggleFavoriteDeck(id: string) {
    toggleFavoriteSavedDeckRecord(id);
    refreshLibrary();
  }

  function handleAssignDeckFolder(id: string, folderId: string | null) {
    assignSavedDeckRecordFolder(id, folderId);
    refreshLibrary();
  }

  function handleToggleDeckSelection(id: string) {
    setSelectedDeckIds((current) => current.includes(id)
      ? current.filter((entry) => entry !== id)
      : [...current, id]);
  }

  function handleToggleSelectAllVisible() {
    const visibleIds = filteredDecks.map((deck) => deck.id);
    const visibleIdSet = new Set(visibleIds);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedDeckIds.includes(id));

    setSelectedDeckIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIdSet.has(id));
      }

      return [...new Set([...current, ...visibleIds])];
    });
  }

  function handleMoveSelectedDecks() {
    if (!bulkFolderId || selectedDeckIds.length === 0) return;
    assignSavedDeckRecordsFolder(selectedDeckIds, bulkFolderId === NO_FOLDER_VALUE ? null : bulkFolderId);
    refreshLibrary();
    setSelectedDeckIds([]);
    setBulkFolderId("");
  }

  function handleRenameFolder(id: string, name: string) {
    renameSavedDeckFolder(id, name);
    refreshLibrary();
  }

  function handleToggleFavoriteFolder(id: string) {
    toggleFavoriteSavedDeckFolder(id);
    refreshLibrary();
  }

  function handleDeleteFolder(id: string) {
    deleteSavedDeckFolder(id);
    refreshLibrary();
  }

  return (
    <div className={`${DEFAULT_PAGE_CONTAINER_CLASS} py-3 space-y-4`}>
      <section className="rounded-xl border border-border/70 bg-bg-card/75 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Decks</p>
            <h1 className="text-xl font-bold text-text-primary">Local Deck Library</h1>
            <p className="text-sm text-text-secondary">Organize saved decks into folders, favorite folders, and bulk-manage deck lists.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCreateFolderOpen(true);
                setFolderDraftError(null);
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-bg-tertiary/20 px-3 text-[11px] font-medium text-text-primary transition hover:bg-bg-hover"
            >
              <FolderIcon />
              New folder
            </button>
            <HoverLabelIconButton
              label={isCreating ? "creating" : "new deck"}
              onClick={handleCreateDeck}
              disabled={isCreating}
              className="bg-accent text-bg-primary hover:bg-accent-hover"
            >
              {isCreating ? "..." : <CreateDeckIcon />}
            </HoverLabelIconButton>
          </div>
        </div>
        {createError && (
          <p className="mt-2 text-sm text-banned">{createError}</p>
        )}
      </section>

      <section className="rounded-xl border border-border/70 bg-bg-card/60 p-3 sm:p-4">
        <div className="flex flex-col gap-3 border-b border-border/60 pb-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Folders</p>
              <span className="text-[10px] uppercase tracking-[0.08em] text-text-muted">
                {folders.length} custom
              </span>
            </div>
            <h2 className="text-base font-semibold text-text-primary">Browse deck groups</h2>
            <p className="max-w-2xl text-sm text-text-secondary">
              Favorite folders stay first. Deleting a folder keeps its decks saved and returns them to unfiled.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <FolderScopeButton
              active={selectedFilter.kind === "all"}
              label="All decks"
              count={savedDecks.length}
              icon={<DeckStackIcon />}
              onClick={() => setActiveFilter({ kind: "all" })}
            />
            <FolderScopeButton
              active={selectedFilter.kind === "favorites"}
              label="Favorites"
              count={favoriteDeckCount}
              icon={<FavoriteIcon filled />}
              onClick={() => setActiveFilter({ kind: "favorites" })}
            />
            <FolderScopeButton
              active={selectedFilter.kind === "unfiled"}
              label="Unfiled"
              count={unfiledDeckCount}
              icon={<FolderIcon />}
              onClick={() => setActiveFilter({ kind: "unfiled" })}
            />
          </div>
        </div>

        <div className="pt-3">
          {folders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-bg-primary/20 px-4 py-6 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-bg-input/70 text-text-secondary">
                <FolderIcon />
              </div>
              <p className="text-sm font-medium text-text-primary">No custom folders yet</p>
              <p className="mt-1 text-sm text-text-secondary">Create one to keep matchup tests, meta lists, or favorites grouped together.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {folders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  deckCount={deckCountsByFolderId.get(folder.id) ?? 0}
                  active={selectedFilter.kind === "folder" && selectedFilter.folderId === folder.id}
                  onSelect={() => setActiveFilter({ kind: "folder", folderId: folder.id })}
                  onRename={handleRenameFolder}
                  onToggleFavorite={handleToggleFavoriteFolder}
                  onDelete={() => setFolderPendingDelete(folder)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border/70 bg-bg-card/70 p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-text-muted">Selection</p>
            <h2 className="text-lg font-semibold text-text-primary">{filterMeta.title}</h2>
            <p className="text-sm text-text-secondary">{filterMeta.description}</p>
          </div>

          <div className="w-full space-y-2 xl:w-auto xl:min-w-[520px]">
            <div className="flex items-center justify-between gap-2">
              <SelectionToggle
                checked={filteredDecks.length > 0 && selectedVisibleDeckIds.length === filteredDecks.length}
                indeterminate={selectedVisibleDeckIds.length > 0 && selectedVisibleDeckIds.length < filteredDecks.length}
                onChange={handleToggleSelectAllVisible}
                label={`Select visible (${filteredDecks.length})`}
              />
              <span className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-[11px] font-medium ${
                selectedDeckIds.length > 0
                  ? "border-accent/30 bg-accent/10 text-text-primary"
                  : "border-border/70 bg-bg-input/45 text-text-secondary"
              }`}>
                {selectedDeckIds.length > 0 ? `${selectedDeckIds.length} selected` : "0 selected"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(180px,1fr)_auto_auto_auto]">
              <select
                value={bulkFolderId}
                onChange={(event) => setBulkFolderId(event.target.value)}
                disabled={selectedDeckIds.length === 0}
                className="col-span-2 h-8 min-w-0 rounded-lg border border-border bg-bg-input px-2 text-[11px] text-text-primary outline-none transition focus:border-accent/60 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1"
              >
                <option value="">Move selected to...</option>
                <option value={NO_FOLDER_VALUE}>No folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleMoveSelectedDecks}
                disabled={selectedDeckIds.length === 0 || !bulkFolderId}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-tertiary/20 px-3 text-[11px] font-medium text-text-primary transition hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FolderIcon />
                Move
              </button>
              <button
                type="button"
                onClick={() => setSelectedDeckIds([])}
                disabled={selectedDeckIds.length === 0}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-bg-tertiary/20 px-3 text-[11px] font-medium text-text-primary transition hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={selectedDeckIds.length === 0}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-banned/40 bg-banned/10 px-3 text-[11px] font-medium text-banned transition hover:bg-banned/16 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <TrashIcon />
                Delete
              </button>
            </div>
          </div>
        </div>
      </section>

      {filteredDecks.length === 0 ? (
        <section className="rounded-xl border border-border/70 bg-bg-card/70 px-4 py-8 text-center text-sm text-text-secondary">
          {savedDecks.length === 0
            ? "No saved decks yet."
            : selectedFilter.kind === "folder"
              ? "This folder does not have any decks yet."
              : selectedFilter.kind === "favorites"
                ? "No favorite decks yet."
                : selectedFilter.kind === "unfiled"
                  ? "Every saved deck is already in a folder."
                  : "No decks match this view."}
        </section>
      ) : (
        <section className="space-y-2">
          {filteredDecks.map((savedDeck) => {
            const leader = savedDeck.leaderCardNumber ? leadersByNumber[savedDeck.leaderCardNumber] : null;
            return (
              <SavedDeckRow
                key={savedDeck.id}
                savedDeck={savedDeck}
                folders={folders}
                folderName={savedDeck.folderId ? folders.find((folder) => folder.id === savedDeck.folderId)?.name ?? null : null}
                leader={leader}
                selected={selectedDeckIds.includes(savedDeck.id)}
                onToggleSelected={() => handleToggleDeckSelection(savedDeck.id)}
                onRename={handleRenameDeck}
                onToggleFavorite={handleToggleFavoriteDeck}
                onAssignFolder={handleAssignDeckFolder}
                onDelete={() => setDeckPendingDelete(savedDeck)}
              />
            );
          })}
        </section>
      )}

      {createFolderOpen && (
        <ActionModal
          onClose={() => {
            setCreateFolderOpen(false);
            setFolderDraftName("");
            setFolderDraftError(null);
          }}
          eyebrow="New Folder"
          title="Create folder"
          description="Use folders to group decks for bulk move and delete actions."
          actions={[
            {
              label: "Cancel",
              onClick: () => {
                setCreateFolderOpen(false);
                setFolderDraftName("");
                setFolderDraftError(null);
              },
            },
            {
              label: "Create folder",
              onClick: handleCreateFolder,
              tone: "primary",
              icon: <FolderIcon />,
            },
          ]}
        >
          <div className="space-y-2 pt-1">
            <input
              value={folderDraftName}
              onChange={(event) => {
                setFolderDraftName(event.target.value);
                if (folderDraftError) setFolderDraftError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleCreateFolder();
                }
              }}
              autoFocus
              placeholder="Folder name"
              className="w-full rounded-md border border-border bg-bg-input px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent/60"
            />
            {folderDraftError ? <p className="text-sm text-banned">{folderDraftError}</p> : null}
          </div>
        </ActionModal>
      )}

      {deckPendingDelete && (
        <ActionModal
          onClose={() => setDeckPendingDelete(null)}
          eyebrow="Delete Deck"
          title="Are you sure?"
          description="This cannot be undone. The saved local deck will be removed from this browser."
          actions={[
            { label: "Cancel", onClick: () => setDeckPendingDelete(null) },
            {
              label: "Delete",
              onClick: () => {
                handleDeleteDeck(deckPendingDelete.id);
                setDeckPendingDelete(null);
              },
              tone: "danger",
              icon: <TrashIcon />,
            },
          ]}
        />
      )}

      {folderPendingDelete && (
        <ActionModal
          onClose={() => setFolderPendingDelete(null)}
          eyebrow="Delete Folder"
          title={`Delete "${folderPendingDelete.name}"?`}
          description="The folder will be removed, but the decks inside it will stay saved and become unfiled."
          actions={[
            { label: "Cancel", onClick: () => setFolderPendingDelete(null) },
            {
              label: "Delete folder",
              onClick: () => {
                handleDeleteFolder(folderPendingDelete.id);
                setFolderPendingDelete(null);
              },
              tone: "danger",
              icon: <TrashIcon />,
            },
          ]}
        />
      )}

      {bulkDeleteOpen && (
        <ActionModal
          onClose={() => setBulkDeleteOpen(false)}
          eyebrow="Bulk Delete"
          title={`Delete ${selectedDeckIds.length} deck${selectedDeckIds.length === 1 ? "" : "s"}?`}
          description="This removes every selected saved deck from this browser. This cannot be undone."
          actions={[
            { label: "Cancel", onClick: () => setBulkDeleteOpen(false) },
            {
              label: "Delete selected",
              onClick: handleDeleteSelectedDecks,
              tone: "danger",
              icon: <TrashIcon />,
            },
          ]}
        />
      )}
    </div>
  );
}

function FolderScopeButton({
  active,
  label,
  count,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
        active
          ? "border-accent/45 bg-accent/10 text-text-primary"
          : "border-border/70 bg-bg-primary/20 text-text-secondary hover:bg-bg-hover hover:text-text-primary"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className={active ? "text-accent" : ""}>
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </span>
      <span className={`text-[11px] ${active ? "text-text-primary" : "text-text-muted"}`}>
        {count}
      </span>
    </button>
  );
}

function FolderCard({
  folder,
  deckCount,
  active,
  onSelect,
  onRename,
  onToggleFavorite,
  onDelete,
}: {
  folder: SavedDeckFolder;
  deckCount: number;
  active: boolean;
  onSelect: () => void;
  onRename: (id: string, name: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState<string | null>(null);
  const currentDraftName = draftName ?? folder.name;

  function commitRename() {
    const normalizedName = currentDraftName.trim();
    if (!normalizedName) {
      setDraftName(null);
      setIsRenaming(false);
      return;
    }

    onRename(folder.id, normalizedName);
    setDraftName(null);
    setIsRenaming(false);
  }

  return (
    <article className={`group rounded-lg border px-3 py-2 transition ${
      active
        ? "border-accent/45 bg-accent/8"
        : "border-border/70 bg-bg-primary/25 hover:bg-bg-primary/35"
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                active
                  ? "border-accent/25 bg-accent/10 text-accent"
                  : "border-border/70 bg-bg-input/70 text-text-secondary"
              }`}>
                <FolderIcon />
              </span>
              <input
                value={currentDraftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commitRename();
                  } else if (event.key === "Escape") {
                    setDraftName(null);
                    setIsRenaming(false);
                  }
                }}
                autoFocus
                className="h-8 w-full rounded-lg border border-border bg-bg-input px-2.5 text-sm font-semibold text-text-primary outline-none transition focus:border-accent/60"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={onSelect}
              className="block w-full text-left"
            >
              <div className="flex items-center gap-2">
                <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                  active
                    ? "border-accent/25 bg-accent/10 text-accent"
                    : "border-border/70 bg-bg-input/70 text-text-secondary"
                }`}>
                  <FolderIcon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-text-primary">{folder.name}</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-text-secondary">
                    {deckCount} deck{deckCount === 1 ? "" : "s"}
                  </span>
                </span>
              </div>
            </button>
          )}
        </div>

        {!isRenaming && (
          <div className="flex shrink-0 items-center gap-1">
            <HoverLabelIconButton
              label={folder.favorite ? "unfavorite folder" : "favorite folder"}
              onClick={() => onToggleFavorite(folder.id)}
              className={folder.favorite
                ? "border-amber-300/50 bg-amber-300/12 text-amber-200 hover:bg-amber-300/18"
                : "border-transparent text-text-muted hover:text-text-primary"}
            >
              <FavoriteIcon filled={folder.favorite} />
            </HoverLabelIconButton>
            <HoverLabelIconButton
              label="rename folder"
              onClick={() => {
                setDraftName(folder.name);
                setIsRenaming(true);
              }}
              className="border-border bg-bg-tertiary/20 text-text-primary hover:bg-bg-hover"
            >
              <EditIcon />
            </HoverLabelIconButton>
            <HoverLabelIconButton
              label="delete folder"
              onClick={onDelete}
              className="border-border bg-bg-tertiary/12 text-banned hover:bg-banned/10"
            >
              <TrashIcon />
            </HoverLabelIconButton>
          </div>
        )}
      </div>
    </article>
  );
}

function SavedDeckRow({
  savedDeck,
  folders,
  folderName,
  leader,
  selected,
  onToggleSelected,
  onRename,
  onToggleFavorite,
  onAssignFolder,
  onDelete,
}: {
  savedDeck: SavedDeckRecord;
  folders: SavedDeckFolder[];
  folderName: string | null;
  leader?: CardDetail | null;
  selected: boolean;
  onToggleSelected: () => void;
  onRename: (id: string, localName: string | null) => void;
  onToggleFavorite: (id: string) => void;
  onAssignFolder: (id: string, folderId: string | null) => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const [isRenaming, setIsRenaming] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [menuDirection, setMenuDirection] = useState<"down" | "up">("down");
  const [draftName, setDraftName] = useState<string | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const imageUrl = leader?.variants[0]?.media.thumbnail_url
    ?? leader?.variants[0]?.media.image_url
    ?? null;
  const fallbackTitle = leader
    ? `${leader.card_number.split("-")[0]} ${leader.name}`
    : "Untitled deck";
  const title = savedDeck.localName?.trim() || fallbackTitle;
  const leaderName = leader?.name ?? null;
  const leaderColors = leader?.color ?? [];
  const colorLabel = leaderColors.length > 0 ? leaderColors.join("/") : null;
  const currentDraftName = draftName ?? savedDeck.localName ?? "";

  useEffect(() => {
    if (!showActions) return;
    function handleClickOutside(event: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActions]);

  function commitRename() {
    const normalized = currentDraftName.trim();
    onRename(savedDeck.id, normalized.length > 0 ? normalized : null);
    setDraftName(null);
    setIsRenaming(false);
  }

  return (
    <article className={`group/row relative rounded-lg border transition ${
      selected
        ? "border-accent/45 bg-accent/8"
        : "border-border/70 bg-bg-card/65 hover:border-border hover:bg-bg-card/85"
    }`}>
      <div className="flex items-stretch">
        {/* Checkbox */}
        <div className="flex shrink-0 items-center justify-center px-2">
          <SelectionToggle
            checked={selected}
            onChange={onToggleSelected}
            label={`Select ${title}`}
            compact
          />
        </div>

        {/* Image */}
        <div className="relative w-[80px] shrink-0 overflow-hidden rounded-l-lg sm:w-[140px]">
          <Link
            to={deckHashToViewPath(savedDeck.hash, savedDeck.id)}
            className="absolute inset-0 overflow-hidden bg-bg-tertiary/40 transition hover:opacity-90"
            aria-label={`Open ${title}`}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={leaderName ?? title}
                className="block h-full w-full scale-[2.5] object-cover object-[50%_18%] sm:scale-[1.8]"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-text-muted">
                {leader?.card_number ?? "Deck"}
              </div>
            )}
          </Link>
        </div>

        {/* Content + Actions */}
        <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {isRenaming ? (
                <input
                  value={currentDraftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") { event.preventDefault(); commitRename(); }
                    else if (event.key === "Escape") { setDraftName(null); setIsRenaming(false); }
                  }}
                  autoFocus
                  className="h-7 w-full rounded-md border border-border bg-bg-input px-2 text-sm font-semibold text-text-primary outline-none focus:border-accent/60"
                />
              ) : (
                <Link
                  to={deckHashToViewPath(savedDeck.hash, savedDeck.id)}
                  className="group/title min-w-0 hover:no-underline"
                >
                  <span className="block truncate text-sm font-semibold text-text-primary group-hover/title:text-accent transition-colors">{title}</span>
                </Link>
              )}

              <div className="mt-0.5 flex items-center gap-x-1.5 text-[11px] text-text-secondary">
                {colorLabel && (
                  <>
                    <span>{colorLabel}</span>
                    <span className="text-border">·</span>
                  </>
                )}
                <span>{savedDeck.mainCount}/50</span>
                {folderName && (
                  <>
                    <span className="text-border">·</span>
                    <span className="truncate">{folderName}</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onToggleFavorite(savedDeck.id)}
                aria-label={savedDeck.favorite ? "unfavorite" : "favorite"}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition ${
                  savedDeck.favorite
                    ? "border-amber-300/50 bg-amber-300/12 text-amber-200 hover:bg-amber-300/18"
                    : "border-transparent text-text-muted hover:text-text-primary"
                }`}
              >
                <FavoriteIcon filled={savedDeck.favorite} />
              </button>

              <Link
                to={deckHashToEditPath(savedDeck.hash, savedDeck.id)}
                className="hidden h-7 items-center gap-1.5 rounded-md border border-border bg-bg-tertiary/20 px-2.5 text-[11px] font-medium text-text-primary hover:bg-bg-hover hover:no-underline sm:inline-flex"
              >
                <EditIcon />
                Edit
              </Link>

              {/* Overflow menu */}
              <div className="relative" ref={actionsRef}>
                <button
                  ref={menuButtonRef}
                  type="button"
                  onClick={() => {
                    if (!showActions && menuButtonRef.current) {
                      const rect = menuButtonRef.current.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - rect.bottom;
                      setMenuDirection(spaceBelow < 220 ? "up" : "down");
                    }
                    setShowActions(!showActions);
                  }}
                  aria-label="More actions"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-text-muted transition hover:border-border hover:bg-bg-hover hover:text-text-primary"
                >
                  <MoreIcon />
                </button>
                {showActions && (
                  <div className={`absolute right-0 z-20 w-44 rounded-lg border border-border/80 bg-bg-primary shadow-[0_8px_24px_rgba(0,0,0,0.4)] ${
                    menuDirection === "up" ? "bottom-full mb-1" : "top-full mt-1"
                  }`}>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => { setShowActions(false); navigate(deckHashToEditPath(savedDeck.hash, savedDeck.id)); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-text-primary hover:bg-bg-hover sm:hidden"
                      >
                        <EditIcon />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => { setDraftName(savedDeck.localName ?? ""); setIsRenaming(true); setShowActions(false); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-text-primary hover:bg-bg-hover"
                      >
                        <EditIcon />
                        Rename
                      </button>
                      <div className="px-3 py-1.5">
                        <label className="text-[10px] uppercase tracking-wide text-text-muted">Folder</label>
                        <select
                          value={savedDeck.folderId ?? NO_FOLDER_VALUE}
                          onChange={(event) => {
                            onAssignFolder(savedDeck.id, event.target.value === NO_FOLDER_VALUE ? null : event.target.value);
                            setShowActions(false);
                          }}
                          className="mt-0.5 h-7 w-full rounded-md border border-border bg-bg-input px-1.5 text-[11px] text-text-primary outline-none"
                        >
                          <option value={NO_FOLDER_VALUE}>No folder</option>
                          {folders.map((folder) => (
                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="my-0.5 border-t border-border/60" />
                      <button
                        type="button"
                        onClick={() => { onDelete(); setShowActions(false); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-banned hover:bg-banned/10"
                      >
                        <TrashIcon />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function SelectionToggle({
  checked,
  indeterminate = false,
  onChange,
  label,
  compact = false,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className={`inline-flex items-center gap-2 text-[11px] ${compact
      ? "text-text-secondary"
      : `h-8 rounded-lg border px-2.5 font-medium transition ${
        checked || indeterminate
          ? "border-accent/30 bg-accent/10 text-text-primary"
          : "border-border/70 bg-bg-input/60 text-text-secondary hover:bg-bg-input"
      }`}`}>
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="h-4 w-4 rounded border border-border bg-bg-input text-accent focus:ring-2 focus:ring-accent/40"
      />
      {!compact ? <span>{label}</span> : null}
    </label>
  );
}

function HoverLabelIconButton({
  children,
  label,
  onClick,
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className="group/icon-button relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        {children}
      </button>
      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border/70 bg-bg-primary/96 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.04em] text-text-primary shadow-[0_10px_24px_rgba(0,0,0,0.35)] group-hover/icon-button:block">
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

function DeckStackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
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

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
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
