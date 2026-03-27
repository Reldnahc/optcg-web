# optcg-web - React SPA (Public Site)

Scryfall-inspired public card database frontend for One Piece Card Game.

## Tech Stack
- **Framework:** React 19, React Router v7, Vite 8
- **Data fetching:** TanStack React Query v5
- **Styling:** Tailwind CSS v4 (CSS-based config, not `tailwind.config.ts`)
- **Deployment:** S3 + CloudFront at `poneglyph.one`

## Frontend / API Boundary
This repo is presentation-only. It should not own data/business rules that determine what card data is "correct".

Keep in `optcg-web`:
- selected variant UI state
- query param syncing
- rendering cards, prices, legality, and docs
- external link generation such as eBay searches

Keep in `optcg-api`:
- search parsing and filter semantics
- variant ordering and default image selection
- legality aggregation and status derivation
- artist semantics and other card-data rules
- which variants/images are returned to clients

If a change affects the meaning or correctness of card data, it belongs in the API, not here.

## Project Structure
```text
src/
|-- main.tsx                    # React root
|-- App.tsx                     # Router + QueryClient setup
|-- api/
|   |-- client.ts               # Thin fetch wrapper
|   |-- hooks.ts                # TanStack Query hooks
|   `-- types.ts                # TypeScript types matching API responses
|-- components/
|   |-- layout/
|   |   |-- Layout.tsx          # Shell with Header + Outlet
|   |   |-- Header.tsx          # Top nav with search
|   |   |-- Footer.tsx
|   |   `-- PageContainer.tsx   # Reusable page wrapper
|   |-- card/
|   |   |-- CardGrid.tsx
|   |   |-- CardChecklist.tsx
|   |   `-- CardDetail.tsx
|   `-- search/
|       `-- SearchBar.tsx
|-- pages/
|   |-- Home.tsx
|   |-- Search.tsx
|   |-- AdvancedSearch.tsx
|   |-- CardPage.tsx
|   |-- SetBrowser.tsx
|   |-- SetPage.tsx
|   |-- FormatBrowser.tsx
|   |-- FormatPage.tsx
|   |-- DonBrowser.tsx
|   |-- SyntaxHelp.tsx
|   |-- ApiDocs.tsx
|   `-- RandomRedirect.tsx
|-- hooks/
|   `-- useDebounce.ts
`-- styles/
    `-- index.css
```

## Environment Variables
```bash
VITE_API_URL=
```

Defaults to same-origin, which supports the local Vite proxy and production absolute API URLs.

## Key Patterns

### API Client
`src/api/client.ts` exports `apiFetch<T>(path, params?)`:
- prepends `VITE_API_URL` + `/v1` to all paths
- throws on non-OK with error message from the response body
- all hooks in `hooks.ts` use this client

### TanStack Query Hooks
Each API endpoint should have a corresponding hook in `src/api/hooks.ts`.

Examples:
- `useCardSearch(params)`
- `useCard(cardNumber, lang)`
- `useAutocomplete(q)`
- `useSets()` / `useSet(code)`
- `useFormats()` / `useFormat(name)`
- `useDonCards(params)`
- `useRandomCard(params)`

QueryClient config uses a 5 minute `staleTime` and 1 retry.

### Routing
```text
/                    -> Home
/search              -> Search
/search/syntax       -> SyntaxHelp
/advanced            -> AdvancedSearch
/cards/:card_number  -> CardPage
/sets                -> SetBrowser
/sets/:set_code      -> SetPage
/formats             -> FormatBrowser
/formats/:name       -> FormatPage
/don                 -> DonBrowser
/random-redirect     -> RandomRedirect
/api                 -> ApiDocs
```

### Styling
Tailwind v4 is configured in `src/styles/index.css`. There is no `tailwind.config.ts`.

Use the theme tokens already defined there via classes like:
- `bg-bg-primary`
- `text-accent`
- `border-border`

### Component Patterns
- `PageContainer`: reusable page wrapper with title/subtitle
- `CardDetail`: full card detail with image selection, prices, and legality
- legality badges use API-provided statuses; frontend should only render them
- date formatting should use `timeZone: "UTC"` to avoid off-by-one display bugs

### Types
`src/api/types.ts` should mirror API responses, not invent frontend-only data semantics.

Important:
- card-level business rules should not be recreated in types/comments here
- variant-level fields such as artist belong on `CardImage`

## Scripts
```bash
npm run dev
npm run build
npm run preview
```

## Admin Panel
The admin panel lives in a separate repo: `optcg-admin`. This repo is the public site only.
