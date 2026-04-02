import { mainDeckCount } from "./model";
import type { Deck } from "./types";

const SAVED_DECKS_STORAGE_KEY = "optcg.savedDecks.v1";
const SAVED_DECK_FOLDERS_STORAGE_KEY = "optcg.savedDeckFolders.v1";

export type SavedDeckFolder = {
  id: string;
  name: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
};

export type SavedDeckRecord = {
  id: string;
  hash: string;
  leaderCardNumber: string | null;
  mainCount: number;
  localName: string | null;
  folderId: string | null;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
};

export function listSavedDecks(): SavedDeckRecord[] {
  const records = readSavedDecks();
  return [...records].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

export function cleanupEmptySavedDeckRecords() {
  const records = readSavedDecks();
  const nextRecords = records.filter((record) => {
    const hasName = typeof record.localName === "string" && record.localName.trim().length > 0;
    const hasLeader = typeof record.leaderCardNumber === "string" && record.leaderCardNumber.trim().length > 0;
    const hasCards = record.mainCount > 0;
    return hasName || hasLeader || hasCards;
  });

  if (nextRecords.length !== records.length) {
    writeSavedDecks(nextRecords);
  }

  return records.length - nextRecords.length;
}

export function getSavedDeckRecord(id: string) {
  return readSavedDecks().find((record) => record.id === id) ?? null;
}

export function getSavedDeckRecordByHash(hash: string) {
  return readSavedDecks().find((record) => record.hash === hash) ?? null;
}

export function listSavedDeckFolders(): SavedDeckFolder[] {
  const folders = readSavedDeckFolders();
  return [...folders].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    const nameOrder = a.name.localeCompare(b.name);
    if (nameOrder !== 0) return nameOrder;
    return a.createdAt - b.createdAt;
  });
}

export function createSavedDeckFolder(name: string) {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Folder name is required.");
  }

  const folder: SavedDeckFolder = {
    id: createSavedDeckId(),
    name: normalizedName,
    favorite: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  writeSavedDeckFolders([...readSavedDeckFolders(), folder]);
  return folder;
}

export function renameSavedDeckFolder(id: string, name: string) {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw new Error("Folder name is required.");
  }

  const folders = readSavedDeckFolders();
  const nextFolders = folders.map((folder) => folder.id === id
    ? {
        ...folder,
        name: normalizedName,
        updatedAt: Date.now(),
      }
    : folder);

  writeSavedDeckFolders(nextFolders);
  return nextFolders.find((folder) => folder.id === id) ?? null;
}

export function toggleFavoriteSavedDeckFolder(id: string) {
  const folders = readSavedDeckFolders();
  const nextFolders = folders.map((folder) => folder.id === id
    ? {
        ...folder,
        favorite: !folder.favorite,
        updatedAt: Date.now(),
      }
    : folder);

  writeSavedDeckFolders(nextFolders);
  return nextFolders.find((folder) => folder.id === id) ?? null;
}

export function deleteSavedDeckFolder(id: string) {
  writeSavedDeckFolders(readSavedDeckFolders().filter((folder) => folder.id !== id));
  writeSavedDecks(readSavedDecks().map((record) => record.folderId === id
    ? { ...record, folderId: null }
    : record));
}

export function createSavedDeckRecord(hash: string, deck: Deck, options?: { folderId?: string | null }) {
  const record: SavedDeckRecord = {
    id: createSavedDeckId(),
    hash,
    leaderCardNumber: deck.leader?.card_number ?? null,
    mainCount: mainDeckCount(deck),
    localName: null,
    folderId: options?.folderId ?? null,
    favorite: false,
    createdAt: deck.created_at,
    updatedAt: deck.updated_at,
  };

  writeSavedDecks([...readSavedDecks(), record]);
  return record;
}

export function upsertSavedDeckRecord(id: string, hash: string, deck: Deck) {
  const records = readSavedDecks();
  const existing = records.find((record) => record.id === id);
  const nextRecord: SavedDeckRecord = {
    id,
    hash,
    leaderCardNumber: deck.leader?.card_number ?? null,
    mainCount: mainDeckCount(deck),
    localName: existing?.localName ?? null,
    folderId: existing?.folderId ?? null,
    favorite: existing?.favorite ?? false,
    createdAt: existing?.createdAt ?? deck.created_at,
    updatedAt: Math.max(existing?.updatedAt ?? 0, deck.updated_at, Date.now()),
  };

  const nextRecords = existing
    ? records.map((record) => record.id === id ? nextRecord : record)
    : [...records, nextRecord];

  writeSavedDecks(nextRecords);
  return nextRecord;
}

export function deleteSavedDeckRecord(id: string) {
  writeSavedDecks(readSavedDecks().filter((record) => record.id !== id));
}

export function deleteSavedDeckRecords(ids: string[]) {
  if (ids.length === 0) return;

  const idSet = new Set(ids);
  writeSavedDecks(readSavedDecks().filter((record) => !idSet.has(record.id)));
}

export function renameSavedDeckRecord(id: string, localName: string | null) {
  const records = readSavedDecks();
  const nextRecords = records.map((record) => record.id === id
    ? {
        ...record,
        localName,
        updatedAt: Date.now(),
      }
    : record);

  writeSavedDecks(nextRecords);
  return nextRecords.find((record) => record.id === id) ?? null;
}

export function toggleFavoriteSavedDeckRecord(id: string) {
  const records = readSavedDecks();
  const nextRecords = records.map((record) => record.id === id
    ? {
        ...record,
        favorite: !record.favorite,
        updatedAt: Date.now(),
      }
    : record);

  writeSavedDecks(nextRecords);
  return nextRecords.find((record) => record.id === id) ?? null;
}

export function assignSavedDeckRecordFolder(id: string, folderId: string | null) {
  const normalizedFolderId = normalizeFolderId(folderId);
  const records = readSavedDecks();
  const nextRecords = records.map((record) => record.id === id
    ? {
        ...record,
        folderId: normalizedFolderId,
        updatedAt: Date.now(),
      }
    : record);

  writeSavedDecks(nextRecords);
  return nextRecords.find((record) => record.id === id) ?? null;
}

export function assignSavedDeckRecordsFolder(ids: string[], folderId: string | null) {
  if (ids.length === 0) return [];

  const normalizedFolderId = normalizeFolderId(folderId);
  const idSet = new Set(ids);
  const now = Date.now();
  const records = readSavedDecks();
  const nextRecords = records.map((record) => idSet.has(record.id)
    ? {
        ...record,
        folderId: normalizedFolderId,
        updatedAt: now,
      }
    : record);

  writeSavedDecks(nextRecords);
  return nextRecords.filter((record) => idSet.has(record.id));
}

function readSavedDecks(): SavedDeckRecord[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(SAVED_DECKS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];

      const candidate = entry as Partial<SavedDeckRecord>;
      if (typeof candidate.id !== "string" || typeof candidate.hash !== "string") return [];

      return [{
        id: candidate.id,
        hash: candidate.hash,
        leaderCardNumber: typeof candidate.leaderCardNumber === "string" ? candidate.leaderCardNumber : null,
        mainCount: typeof candidate.mainCount === "number" ? candidate.mainCount : 0,
        localName: typeof candidate.localName === "string" ? candidate.localName : null,
        folderId: typeof candidate.folderId === "string" ? candidate.folderId : null,
        favorite: candidate.favorite === true,
        createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now(),
        updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : Date.now(),
      }];
    });
  } catch {
    return [];
  }
}

function readSavedDeckFolders(): SavedDeckFolder[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(SAVED_DECK_FOLDERS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];

      const candidate = entry as Partial<SavedDeckFolder>;
      if (typeof candidate.id !== "string" || typeof candidate.name !== "string") return [];

      return [{
        id: candidate.id,
        name: candidate.name.trim(),
        favorite: candidate.favorite === true,
        createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now(),
        updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : Date.now(),
      }];
    }).filter((folder) => folder.name.length > 0);
  } catch {
    return [];
  }
}

function writeSavedDecks(records: SavedDeckRecord[]) {
  if (!canUseStorage()) return;

  window.localStorage.setItem(SAVED_DECKS_STORAGE_KEY, JSON.stringify(records));
}

function writeSavedDeckFolders(folders: SavedDeckFolder[]) {
  if (!canUseStorage()) return;

  window.localStorage.setItem(SAVED_DECK_FOLDERS_STORAGE_KEY, JSON.stringify(folders));
}

function createSavedDeckId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `deck-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeFolderId(folderId: string | null) {
  if (typeof folderId !== "string" || folderId.trim().length === 0) {
    return null;
  }

  return readSavedDeckFolders().some((folder) => folder.id === folderId) ? folderId : null;
}
