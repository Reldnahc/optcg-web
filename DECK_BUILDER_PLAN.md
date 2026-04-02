# Deck Builder — Design Document

## Overview

Client-side deck builder for OPTCG. Decks live entirely in the URL via a **deck hash** — no localStorage, no server-side persistence. Bookmark it or share it.

---

## Status

- `Phase 0 - API` is complete: `POST /v1/cards/batch` is implemented in `optcg-api`.
- `Phase 1 - Core` is partially complete in `optcg-web`:
  - hash-backed deck state exists
  - `/decks/new`, `/decks/edit/:hash`, and `/decks/:hash` routes exist
  - search/add/remove/count adjustment works
  - share URL and plaintext export work
- Current scope reduction:
  - DON deck support is removed from the current rollout
  - the implemented builder currently covers leader + main deck only
- Not implemented yet:
  - variant picker / variant persistence UI
  - full stats panel
  - format legality validation
  - import polish beyond opening a hash URL

---

## Deck Structure

An OPTCG deck normally has three zones, but the current rollout only implements leader + main deck:

| Zone       | Count   | Card Types Allowed            |
|------------|---------|-------------------------------|
| Leader     | exactly 1 | Leader                      |
| Main Deck  | exactly 50 | Character, Event, Stage    |
| DON Deck   | exactly 10 | DON (deferred, out of current scope) |

**Copy limit:** max 4 copies of any card (by `card_number`), unless `max_copies` in legality says otherwise.

### Internal Deck Representation

```ts
type DeckEntry = {
  card_number: string;   // e.g. "OP01-001"
  count: number;         // 1-4 (or max_copies)
  variant_index?: number; // optional — cosmetic only, defaults to 0
};

type Deck = {
  name: string;
  leader: DeckEntry | null;
  main: DeckEntry[];        // should sum to 50
  don: DeckEntry | null;    // deferred for now; not currently exposed in the web UI
  format?: string;          // optional format tag for validation
  created_at: number;       // epoch ms
  updated_at: number;
};
```

Variants are **cosmetic only** — they don't affect legality or deck hash.

---

## Deck Hash Format

### Goals
- URL-safe, reasonably compact
- **Backwards compatible:** old hashes always parse correctly in new code
- **Forwards compatible:** new hashes degrade gracefully in old code (unknown fields ignored)

### Design: Compressed JSON + Versioned Prefix

```
d<version>.<base64url_compressed_payload>
```

**Version 1 payload** (before compression):

```json
{
  "l": "OP01-001",
  "n": "Red Luffy Aggro",
  "d": "DON-001~3",
  "m": ["OP01-006x4", "OP01-016x4", "OP01-017x4~2", "OP02-033x3"]
}
```

- `n` — (optional) deck name. If missing, default to "Untitled Deck" or generate from leader name.
- `l` — leader card number with optional `~<variant_index>`. If `~` is omitted, use the API's first variant.
- `d` — (optional) DON card entry: `<card_number>` with optional `~<variant_index>` (count is always 10, omitted). If missing, use the first DON the API returns.
- `m` — main deck entries, each `<card_number>x<count>` with optional `~<variant_index>`. If `~` is omitted, use whatever variant the API returns first.
- Entries sorted by card_number for deterministic hashes
- Future versions can add keys (e.g. `"f"` for format) — old parsers ignore unknown keys

**Pipeline:** `JSON string → deflate (CompressionStream, when available) → base64url → prepend "d1."`

**Example URL:** `/decks?h=d1.eJyrVkrOz0nVUbJSKs9I...` (~80-120 chars for a full deck)

### Encoding/Decoding — Performance Notes

**IMPORTANT: Use native browser APIs, not JS-land implementations.**

- **Compression:** Use the [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream) (`new CompressionStream('deflate')` / `new DecompressionStream('deflate')`). This runs in native browser code, not JS. Supported in all modern browsers.
- **Base64url:** Convert between `Uint8Array` and base64url manually using a lookup table or `TextEncoder`/`TextDecoder` — do NOT use `btoa()`/`atob()` (slow, doesn't handle binary). A simple `Uint8Array → base64url` function with a char table is ~10 lines and runs fast.
- The encode/decode functions will be `async` since `CompressionStream` is stream-based, but the actual work is native and fast.

```ts
// Sketch — not final implementation
async function encodeDeckHash(deck: DeckPayload): Promise<string> {
  const json = JSON.stringify(deck);
  const compressed = await compressDeflate(new TextEncoder().encode(json));
  return "d1." + uint8ToBase64Url(compressed);
}

async function decodeDeckHash(hash: string): Promise<DeckPayload> {
  const [version, data] = hash.split(".", 2);
  if (version !== "d1") throw new Error("Unsupported deck format");
  const compressed = base64UrlToUint8(data);
  const json = new TextDecoder().decode(await decompressDeflate(compressed));
  return JSON.parse(json);
}
```

### Compatibility Rules

1. **Parser checks version prefix.** Unknown versions (e.g. `d2.`, `d3.`) → show "deck format not supported, update your app" rather than crashing.
2. **Unknown JSON keys are ignored.** Future versions can add fields to the payload — old parsers just skip them via standard JSON parsing.
3. **Variant is optional.** Entries without `~` default to variant index 0. Old hashes without variants are valid forever.
4. **Current implementation detail:** decode accepts both compressed payloads and raw JSON payloads for `d1`, so hashes created during the initial rollout remain valid.
5. **Breaking changes bump the version** (`d2.`) — old code shows upgrade message gracefully.

---

## UI / UX Flow

### Routes

| Route | Purpose |
|-------|---------|
| `/decks/new` | New empty deck builder |
| `/decks/edit/<hash>` | Edit a deck (anyone can edit any deck — editing produces a new hash) |
| `/decks/<hash>` | Read-only deck view (share target) |

Decks have **no ownership**. They are purely hash-based. Editing a deck changes its hash, producing a new URL. The URL hash is the source of truth. That's it.

### Page Layouts

**`/decks/edit/<hash>` and `/decks/new` — Editor (3 columns on desktop):**

| Left: Search Panel | Center: Deck List | Right: Stats |
|---|---|---|
| Card search (reuse existing `useCardSearch`) | Leader slot | Deck stats (see below) |
| Results as compact image grid | Main deck cards grouped by type | Share / Export buttons |
| Click card → add to deck | Click card → remove or adjust count | Format legality check |

Mobile: tab-based — switch between Search, Deck, and Stats views.

**`/decks/<hash>` — Viewer (2 columns on desktop):**

| Left: Deck List | Right: Stats |
|---|---|
| Leader + main deck (read-only, no add/remove) | Deck stats (same component as editor) |
| | Share / Export buttons |

Mobile: deck list on top, stats below (or tabs).

The stats panel is the **same component** on both pages — only the surrounding layout and edit controls differ.

### Card Search in Builder

- Default search returns **unique cards** (not prints/variants)
- Clicking a card adds 1 copy of the default variant to the appropriate zone (Leader → leader slot, Character/Event/Stage → main deck)
- If no leader is set yet, the current implementation searches leaders only until the leader slot is filled
- Long-press or secondary action opens variant picker for that card
- Search reuses `useCardSearch` hook with `prints=cards` mode

### Variant Selection

Variant selection is **separate from card search** — it is an edit action on cards already in the deck, not part of the add flow.

- Each card in the deck list shows its current variant thumbnail
- Click/tap the variant indicator → opens a variant picker panel
- Variant picker fetches `useCard(card_number)` to get full variant list
- Selecting a variant updates the `variant_index` on that deck entry
- Variant is included in the hash if non-default; if omitted, use whatever the API returns first
- **DON:** deferred. DON support is intentionally out of scope for the current web rollout.

### Deck Stats Panel

The right column displays computed stats from the current deck. All derived from the card data fetched via batch endpoint — no extra API calls.

| Stat | Display |
|------|---------|
| **Card count** | Total cards in main deck (X/50) |
| **Cost curve** | Bar chart — count of cards at each cost value (0, 1, 2, ... 10+) |
| **Color distribution** | Breakdown by color (Red, Green, Blue, etc.) — cards with multiple colors count toward each |
| **Card type breakdown** | Character / Event / Stage counts |
| **Trait distribution** | Count per trait (e.g. Straw Hat Crew ×12, Fish-Man ×4) — sorted by frequency |
| **Counter distribution** | Count of cards by counter value (+1000, +2000, no counter) |
| **Power distribution** | Count of cards by power bracket (optional, if useful) |

Stats update live as cards are added/removed. On mobile, stats are in a dedicated tab.

### Sharing & Export

**Share** — copies the deck URL (`https://poneglyph.one/decks/d1.eJyr...`) to clipboard.

**Export** — opens a panel/modal with a plaintext decklist:

```
Leader: OP01-001 Monkey.D.Luffy

4 OP01-006 Nami
4 OP05-091 Roronoa Zoro
3 OP02-033 Sanji
...
```

Format: `<count> <card_number> <card_name>`, one per line, leader on top. The text is shown in a read-only textarea so users can see it. Two action buttons:
- **Copy to clipboard**
- **Download .txt**

---

## Validation Rules

| Rule | Enforcement |
|------|-------------|
| Exactly 1 Leader | Block adding 2nd leader; require leader before saving |
| Main deck = 50 cards | Show count, warn if over/under, block save if != 50 |
| Max 4 copies per card | Grey out add button at limit; respect `max_copies` override |
| DON deck = 10 (or 6) | Deferred. DON support is out of scope for the current rollout. |
| Format legality | Optional — show warnings for banned/restricted cards if format selected |

---

## Error Handling

- **Corrupted hash:** Show error message, don't crash. Offer to start a new deck.
- **Card not found in API:** Cards don't get removed from the game, so this shouldn't happen. If it does, show the raw card_number as a placeholder.
- **Variant not found:** Reset to default (first variant from API). Silent — don't bother the user.

## Client-Side Data

No localStorage. The deck hash in the URL is the single source of truth. On load, decode the hash and fetch card details fresh via the batch endpoint.

---

## Implementation Phases

### Phase 0 — API
- [x] `POST /v1/cards/batch` endpoint in optcg-api

### Phase 1 — Core
- [x] Deck hash encode/decode
- [x] Deck state management (React state, hash in URL)
- [x] Basic builder page with search panel + deck list
- [x] Add/remove cards, count adjustment
- [x] Share via hash URL

### Phase 2 — Polish
- [ ] Variant picker and variant display in deck list
- [ ] Deck stats panel (cost curve, color/type/trait/counter breakdowns)
- [ ] Format validation warnings
- [x] Import from shared hash URL

### Phase 3 — Nice-to-have
- [ ] Deck image export (render deck as shareable image)
- [ ] Drag-and-drop reordering
- [ ] Deck comparison (diff two decks)
- [ ] Clipboard paste import (from other deck builder formats)

---

## API: Batch Card Lookup

**Endpoint:** `POST /v1/cards/batch`

Needed for deck hash imports — when a user opens a shared deck link, we need details for all ~15 unique cards at once.

### Request

```json
{
  "card_numbers": ["OP01-001", "OP01-006", "OP01-016", "OP01-017", "OP02-033"],
  "lang": "en"
}
```

- `card_numbers` — array of card numbers (max ~60 to cover leader + main deck uniques)
- `lang` — optional, defaults to `"en"`

### Response

```json
{
  "data": {
    "OP01-001": { /* full CardDetail object */ },
    "OP01-006": { /* full CardDetail object */ },
    ...
  },
  "missing": ["FAKE-001"]
}
```

Keyed by card_number for easy lookup. `missing` lists any requested cards that weren't found.

### Implementation Notes

The existing `/cards/:card_number` detail endpoint runs 5 sequential queries per card (card row, variants/images, legality, bans, languages). The batch endpoint should run 5 queries total using `ANY($1)` array params:

```sql
-- 1. All card rows
SELECT c.*, ... FROM cards c WHERE c.card_number = ANY($1) AND c.language = $2

-- 2. All variants/images (join through card_id)
SELECT ci.*, ... FROM card_images ci
JOIN cards c ON c.id = ci.card_id
WHERE c.card_number = ANY($1) AND c.language = $2

-- 3. Legality (by distinct blocks)
SELECT ... FROM formats f
LEFT JOIN format_legal_blocks flb ON ...
WHERE flb.block = ANY($1)

-- 4. Bans
SELECT ... FROM format_bans fb WHERE fb.card_number = ANY($1)

-- 5. Available languages
SELECT card_number, language FROM cards WHERE card_number = ANY($1)
```

Then group results by card_number in JS and assemble into CardDetail objects. Same output shape as the single-card endpoint, just batched.

**File:** `optcg-api/src/routes/cards.ts` — add alongside existing card routes.
