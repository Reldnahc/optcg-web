import { apiFetch } from "../api/client";

let dictionary: string[] | null = null;
let indexByNumber: Map<string, number> | null = null;
let fetchPromise: Promise<void> | null = null;

interface DictionaryResponse {
  data: string[];
}

async function fetchDictionary(): Promise<void> {
  const response = await apiFetch<DictionaryResponse>("/decks/dictionary");
  dictionary = response.data;
  indexByNumber = new Map(dictionary.map((cardNumber, index) => [cardNumber, index]));
}

export async function ensureCardDictionary(): Promise<void> {
  if (dictionary) return;
  if (!fetchPromise) {
    fetchPromise = fetchDictionary().catch((error) => {
      fetchPromise = null;
      throw error;
    });
  }
  await fetchPromise;
}

export function getCardDictionary(): string[] {
  if (!dictionary) {
    throw new Error("Card dictionary not loaded — call ensureCardDictionary() first");
  }
  return dictionary;
}

export function getCardIndexByNumber(): Map<string, number> {
  if (!indexByNumber) {
    throw new Error("Card dictionary not loaded — call ensureCardDictionary() first");
  }
  return indexByNumber;
}
