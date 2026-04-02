export type DeckEntry = {
  card_number: string;
  count: number;
  variant_index?: number;
};

export type Deck = {
  leader: DeckEntry | null;
  main: DeckEntry[];
  don: DeckEntry | null;
  format?: string;
  created_at: number;
  updated_at: number;
};

export type DeckPayloadV1 = {
  l?: string;
  d?: string;
  m: string[];
  f?: string;
};
