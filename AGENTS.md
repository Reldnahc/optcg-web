# optcg-web — React SPA (Public Site + Admin Panel)

Scryfall-inspired card database frontend for One Piece Card Game. Will also contain the admin panel pages.

## Tech Stack
- **Framework:** React 19, React Router v7, Vite 8
- **Data fetching:** TanStack React Query v5
- **Styling:** Tailwind CSS v4 (CSS-based config, NOT tailwind.config.ts)
- **Deployment:** S3 + CloudFront at `poneglyph.one` (public), `admin.poneglyph.one` (admin)

## Project Structure
```
src/
├── main.tsx                    # React root
├── App.tsx                     # Router + QueryClient setup
├── api/
│   ├── client.ts              # Thin fetch wrapper — apiFetch<T>(path, params?)
│   ├── hooks.ts               # TanStack Query hooks (useCard, useCardSearch, useSets, etc.)
│   └── types.ts               # TypeScript types matching API responses
├── components/
│   ├── layout/
│   │   ├── Layout.tsx         # Shell with Header + Outlet
│   │   ├── Header.tsx         # Top nav with search
│   │   ├── Footer.tsx
│   │   └── PageContainer.tsx  # Reusable page wrapper (title + subtitle + children)
│   ├── card/
│   │   ├── CardGrid.tsx       # Card search results grid
│   │   ├── CardChecklist.tsx  # Checklist view
│   │   └── CardDetail.tsx     # Full card detail with images, prices, legality
│   ├── search/
│   │   └── SearchBar.tsx
│   ├── don/                   # (empty, DON components inline in pages)
│   └── set/                   # (empty, set components inline in pages)
├── pages/
│   ├── Home.tsx
│   ├── Search.tsx
│   ├── AdvancedSearch.tsx
│   ├── CardPage.tsx           # Renders CardDetail
│   ├── SetBrowser.tsx
│   ├── SetPage.tsx
│   ├── FormatBrowser.tsx
│   ├── FormatPage.tsx         # Format detail with ban table (pair/restricted/banned badges)
│   ├── DonBrowser.tsx
│   ├── SyntaxHelp.tsx
│   ├── ApiDocs.tsx
│   └── RandomRedirect.tsx
├── hooks/
│   └── useDebounce.ts
└── styles/
    └── index.css              # Tailwind v4 @theme config + global styles
```

## Environment Variables
```
VITE_API_URL=    # API base URL, defaults to same origin (for dev proxy or production)
```

## Key Patterns

### API Client
`src/api/client.ts` exports `apiFetch<T>(path, params?)`:
- Prepends `VITE_API_URL` + `/v1` to all paths
- Throws on non-OK with error message from response body
- All hooks in `hooks.ts` use this client

```typescript
const BASE = import.meta.env.VITE_API_URL || "";

export async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}/v1${path}`, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `API error ${res.status}`);
  }
  return res.json();
}
```

### TanStack Query Hooks
Each API endpoint has a corresponding hook in `src/api/hooks.ts`:
- `useCardSearch(params)` — card search with query params
- `useCard(cardNumber, lang)` — card detail
- `useAutocomplete(q)` — search autocomplete
- `useSets()` / `useSet(code)` — set listing and detail
- `useFormats()` / `useFormat(name)` — format listing and detail
- `useDonCards(params)` — DON card listing
- `useRandomCard(params)` — random card (manual trigger)

QueryClient config: 5min staleTime, 1 retry.

### Routing
React Router v7 with a `<Layout>` wrapper:
```
/                    → Home
/search              → Search
/search/syntax       → SyntaxHelp
/advanced            → AdvancedSearch
/cards/:card_number  → CardPage
/sets                → SetBrowser
/sets/:set_code      → SetPage
/formats             → FormatBrowser
/formats/:name       → FormatPage
/don                 → DonBrowser
/random-redirect     → RandomRedirect
/api                 → ApiDocs
```

### Styling (Tailwind v4)
**IMPORTANT:** This project uses Tailwind v4 with CSS-based configuration in `src/styles/index.css`. There is NO `tailwind.config.ts` file. Theme is defined via `@theme { }` block.

Dark color scheme:
```css
@theme {
  --color-bg-primary: #1e2028;     /* main background */
  --color-bg-secondary: #171920;   /* darker areas */
  --color-bg-tertiary: #2a2d38;    /* elevated surfaces */
  --color-bg-card: #242731;        /* card surfaces */
  --color-bg-hover: #30343f;       /* hover state */
  --color-bg-input: #2a2d38;       /* form inputs */
  --color-text-primary: #e8e9ed;   /* main text */
  --color-text-secondary: #a8adb8; /* secondary text */
  --color-text-muted: #6b7080;     /* muted/label text */
  --color-accent: #d4a94c;         /* gold accent */
  --color-accent-hover: #e2bc62;
  --color-link: #7cacf0;           /* links */
  --color-link-hover: #a3c4f7;
  --color-legal: #5ce88e;          /* legal status green */
  --color-banned: #f07070;         /* banned status red */
  --color-restricted: #f0b060;     /* restricted status orange */
  --color-pair: #e0a0d0;           /* pair ban status pink */
  --color-not-legal: #6b7080;
  --color-border: #353849;
  /* Card color pills */
  --color-op-red: #ef4444;
  --color-op-green: #22c55e;
  --color-op-blue: #3b82f6;
  --color-op-purple: #a855f7;
  --color-op-black: #6b7280;
  --color-op-yellow: #eab308;
}
```

Fonts: Manrope (body), Space Grotesk (display/headings), Literata (card effect text).

Use these theme colors via Tailwind classes: `bg-bg-primary`, `text-accent`, `border-border`, etc.

### Component Patterns
- **PageContainer:** Reusable wrapper with title/subtitle. Used by most pages.
- **CardDetail:** Complex component showing card images, variant selector, prices, legality badges.
- **Legality display:** Badges use status colors — `legal` (green), `banned` (red), `restricted` (orange), `pair` (pink). Future bans show as "Upcoming" in accent color.
- **Date formatting:** Always use `timeZone: "UTC"` in `toLocaleDateString()` to prevent off-by-one errors.

### Types
`src/api/types.ts` defines all API response shapes:
- `Card` — search result card
- `CardDetail` — full card with `images: CardImage[]`, `legality: Record<string, {...}>`, `available_languages: string[]`
- `CardImage` — variant with nested `prices` by sub_type
- `SetInfo` / `SetDetail`
- `FormatInfo` / `FormatDetail` — format detail includes `bans[]` with `type`, `max_copies`, `paired_with`
- `DonCard`
- `PaginatedResponse<T>`

## Scripts
```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Admin Panel

The admin panel lives in a separate repo: `optcg-admin`. See `optcg-admin/AGENTS.md` for full details. This repo (`optcg-web`) is the public site only.
