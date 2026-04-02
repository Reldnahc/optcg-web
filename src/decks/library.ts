import { mainDeckCount } from "./model";
import type { Deck } from "./types";

const SAVED_DECKS_STORAGE_KEY = "optcg.savedDecks.v1";

export type SavedDeckRecord = {
  id: string;
  hash: string;
  leaderCardNumber: string | null;
  mainCount: number;
  localName: string | null;
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

export function getSavedDeckRecord(id: string) {
  return readSavedDecks().find((record) => record.id === id) ?? null;
}

export function getSavedDeckRecordByHash(hash: string) {
  return readSavedDecks().find((record) => record.hash === hash) ?? null;
}

export function createSavedDeckRecord(hash: string, deck: Deck) {
  const record: SavedDeckRecord = {
    id: createSavedDeckId(),
    hash,
    leaderCardNumber: deck.leader?.card_number ?? null,
    mainCount: mainDeckCount(deck),
    localName: null,
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
        favorite: candidate.favorite === true,
        createdAt: typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now(),
        updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : Date.now(),
      }];
    });
  } catch {
    return [];
  }
}

function writeSavedDecks(records: SavedDeckRecord[]) {
  if (!canUseStorage()) return;

  window.localStorage.setItem(SAVED_DECKS_STORAGE_KEY, JSON.stringify(records));
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
