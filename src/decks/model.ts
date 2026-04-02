import type { Card, CardDetail } from "../api/types";
import type { Deck, DeckEntry } from "./types";

export function uniqueDeckCardNumbers(deck: Deck) {
  const cardNumbers = new Set<string>();
  if (deck.leader) cardNumbers.add(deck.leader.card_number);
  for (const entry of deck.main) cardNumbers.add(entry.card_number);
  return [...cardNumbers];
}

export function mainDeckCount(deck: Deck) {
  return deck.main.reduce((sum, entry) => sum + entry.count, 0);
}

export function uniqueMainCount(deck: Deck) {
  return new Set(deck.main.map((entry) => entry.card_number)).size;
}

export function addCardToDeck(deck: Deck, card: Card | CardDetail): Deck {
  const now = Date.now();
  const normalizedCardType = card.card_type.toLowerCase();
  const isLeader = normalizedCardType === "leader";

  if (isLeader) {
    return {
      ...deck,
      leader: { card_number: card.card_number, count: 1 },
      updated_at: now,
    };
  }

  const existing = deck.main.find((entry) => entry.card_number === card.card_number);
  if (existing) {
    return {
      ...deck,
      main: deck.main.map((entry) => entry.card_number === card.card_number
        ? { ...entry, count: Math.min(4, entry.count + 1) }
        : entry),
      updated_at: now,
    };
  }

  return {
    ...deck,
    main: [...deck.main, { card_number: card.card_number, count: 1 }],
    updated_at: now,
  };
}

export function updateMainDeckCount(deck: Deck, cardNumber: string, nextCount: number): Deck {
  const normalizedCount = Math.max(0, Math.min(4, Math.trunc(nextCount)));
  return {
    ...deck,
    main: normalizedCount === 0
      ? deck.main.filter((entry) => entry.card_number !== cardNumber)
      : deck.main.map((entry) => entry.card_number === cardNumber ? { ...entry, count: normalizedCount } : entry),
    updated_at: Date.now(),
  };
}

export function removeLeader(deck: Deck): Deck {
  return { ...deck, leader: null, updated_at: Date.now() };
}

export function removeDon(deck: Deck): Deck {
  return { ...deck, don: null, updated_at: Date.now() };
}

export function sortedDeckEntries(deck: Deck) {
  return [...deck.main].sort((a, b) => a.card_number.localeCompare(b.card_number));
}

export function buildDeckExport(deck: Deck) {
  const lines: string[] = [];

  if (deck.leader) {
    lines.push(`${deck.leader.count} ${deck.leader.card_number}`);
  }

  for (const entry of sortedDeckEntries(deck)) {
    lines.push(`${entry.count} ${entry.card_number}`);
  }

  return lines.join("\n").trim();
}

export function groupDeckEntriesByType(entries: DeckEntry[], cardsByNumber: Record<string, CardDetail>) {
  const groups = new Map<string, DeckEntry[]>();

  for (const entry of entries) {
    const cardType = cardsByNumber[entry.card_number]?.card_type ?? "Unknown";
    const rows = groups.get(cardType) ?? [];
    rows.push(entry);
    groups.set(cardType, rows);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, rows]) => ({
      label,
      rows: [...rows].sort((a, b) => a.card_number.localeCompare(b.card_number)),
    }));
}
