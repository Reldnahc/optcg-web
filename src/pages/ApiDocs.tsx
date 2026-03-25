import { useState } from "react";
import { PageContainer } from "../components/layout/PageContainer";

const ENDPOINTS = [
  {
    method: "GET",
    path: "/v1/cards",
    desc: "Search and list cards",
    params: [
      { name: "q", desc: "Advanced search query (see syntax guide)" },
      { name: "name", desc: "Name substring filter" },
      { name: "set", desc: "Set code (e.g. OP01)" },
      { name: "color", desc: "Color filter (e.g. red,green)" },
      { name: "type", desc: "Card type (Leader, Character, Event, Stage)" },
      { name: "rarity", desc: "Rarity code (C, UC, R, SR, SEC, L, SP, P)" },
      { name: "cost", desc: "Exact cost value" },
      { name: "power", desc: "Exact power value" },
      { name: "counter", desc: "Exact counter value" },
      { name: "artist", desc: "Artist name (substring match)" },
      { name: "lang", desc: "Language (en, ja, fr, zh). Default: en" },
      { name: "unique", desc: "prints (one row per variant, default) or cards (one per card number)" },
      { name: "sort", desc: "Sort field: card_number (default), name, cost, power, released, rarity, color, artist, market_price" },
      { name: "order", desc: "asc (default) or desc" },
      { name: "page", desc: "Page number. Default: 1" },
      { name: "limit", desc: "Results per page (1-100). Default: 20" },
    ],
    example: "/v1/cards?q=luffy+c:red&limit=5",
  },
  {
    method: "GET",
    path: "/v1/cards/autocomplete",
    desc: "Card name autocomplete (min 2 chars)",
    params: [{ name: "q", desc: "Search string" }],
    example: "/v1/cards/autocomplete?q=luf",
  },
  {
    method: "GET",
    path: "/v1/cards/:card_number",
    desc: "Get a single card with all variants, images, prices, and legality",
    params: [{ name: "lang", desc: "Language. Default: en" }],
    example: "/v1/cards/OP01-001",
  },
  {
    method: "GET",
    path: "/v1/sets",
    desc: "List all sets with card counts and release dates",
    params: [],
    example: "/v1/sets",
  },
  {
    method: "GET",
    path: "/v1/sets/:set_code",
    desc: "Get a set with its products and cards",
    params: [],
    example: "/v1/sets/OP01",
  },
  {
    method: "GET",
    path: "/v1/random",
    desc: "Get a random card",
    params: [
      { name: "set", desc: "Limit to set code" },
      { name: "color", desc: "Limit to color" },
      { name: "type", desc: "Limit to card type" },
      { name: "rarity", desc: "Limit to rarity" },
      { name: "lang", desc: "Language. Default: en" },
    ],
    example: "/v1/random?color=red",
  },
  {
    method: "GET",
    path: "/v1/formats",
    desc: "List all formats with ban counts",
    params: [],
    example: "/v1/formats",
  },
  {
    method: "GET",
    path: "/v1/formats/:name",
    desc: "Get format details with legal blocks and bans",
    params: [],
    example: "/v1/formats/Standard",
  },
  {
    method: "GET",
    path: "/v1/don",
    desc: "List DON!! cards with images",
    params: [],
    example: "/v1/don",
  },
  {
    method: "GET",
    path: "/v1/prices/:card_number",
    desc: "Get price history for a card",
    params: [{ name: "days", desc: "Number of days of history. Default: 30" }],
    example: "/v1/prices/OP01-001",
  },
];

export function ApiDocs() {
  return (
    <PageContainer
      title="API Documentation"
      subtitle={<>The poneglyph.one API is free and public. Base URL: <code className="text-accent">https://api.poneglyph.one</code></>}
      wide
    >

      <div className="space-y-6">
        {ENDPOINTS.map((ep) => (
          <EndpointCard key={ep.path} endpoint={ep} />
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold mb-3">Card Object</h2>
        <p className="text-sm text-text-secondary mb-3">
          Each card in list results includes these fields:
        </p>
        <div className="bg-bg-card border border-border rounded-lg divide-y divide-border text-sm">
          <FieldRow name="card_number" type="string" desc="e.g. OP01-001" />
          <FieldRow name="name" type="string" desc="Card name" />
          <FieldRow name="language" type="string" desc="en, ja, fr, or zh" />
          <FieldRow name="set" type="string" desc="Set code (e.g. OP01)" />
          <FieldRow name="set_name" type="string" desc="Human-readable set name" />
          <FieldRow name="product" type="string" desc="Product this card was printed in" />
          <FieldRow name="released_at" type="string | null" desc="Release date (ISO)" />
          <FieldRow name="released" type="boolean" desc="Whether the card has been released" />
          <FieldRow name="card_type" type="string" desc="Leader, Character, Event, or Stage" />
          <FieldRow name="rarity" type="string | null" desc="C, UC, R, SR, SEC, L, SP, or P" />
          <FieldRow name="color" type="string[]" desc="Card colors" />
          <FieldRow name="cost" type="number | null" desc="Cost value" />
          <FieldRow name="power" type="number | null" desc="Power value" />
          <FieldRow name="counter" type="number | null" desc="Counter value" />
          <FieldRow name="life" type="number | null" desc="Life value (Leaders)" />
          <FieldRow name="attribute" type="string[] | null" desc="Strike, Slash, Special, Wisdom, Ranged" />
          <FieldRow name="types" type="string[]" desc="Character traits" />
          <FieldRow name="effect" type="string | null" desc="Effect text" />
          <FieldRow name="trigger" type="string | null" desc="Trigger text" />
          <FieldRow name="block" type="string | null" desc="Block number" />
          <FieldRow name="artist" type="string | null" desc="Card artist" />
          <FieldRow name="image_url" type="string | null" desc="Card image URL" />
          <FieldRow name="label" type="string | null" desc="Variant label (unique=prints only): Standard, Alternate Art, etc." />
          <FieldRow name="variant_index" type="number" desc="Variant index (unique=prints only)" />
          <FieldRow name="variant_product_name" type="string | null" desc="Product name for this variant (unique=prints only)" />
        </div>
      </section>
    </PageContainer>
  );
}

function FieldRow({ name, type, desc }: { name: string; type: string; desc: string }) {
  return (
    <div className="px-4 py-2 flex items-baseline gap-4">
      <code className="text-accent font-mono min-w-[180px]">{name}</code>
      <span className="text-text-muted text-xs min-w-[120px]">{type}</span>
      <span className="text-text-secondary">{desc}</span>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: (typeof ENDPOINTS)[number] }) {
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tryIt = async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint.example);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (e) {
      setResponse(`Error: ${(e as Error).message}`);
    }
    setLoading(false);
  };

  return (
    <div className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold bg-legal/20 text-legal px-2 py-0.5 rounded">
            {endpoint.method}
          </span>
          <code className="text-sm text-accent">{endpoint.path}</code>
        </div>
        <span className="text-sm text-text-secondary">{endpoint.desc}</span>
      </div>

      {endpoint.params.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs text-text-muted mb-2 font-semibold uppercase tracking-wider">Parameters</p>
          <div className="space-y-1">
            {endpoint.params.map((p) => (
              <div key={p.name} className="flex items-baseline gap-3 text-sm">
                <code className="text-accent">{p.name}</code>
                <span className="text-text-secondary">{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 py-3 flex items-center gap-3">
        <code className="text-xs text-text-muted flex-1 truncate">{endpoint.example}</code>
        <button
          onClick={tryIt}
          disabled={loading}
          className="text-xs bg-bg-tertiary hover:bg-bg-hover border border-border px-3 py-1 rounded text-text-primary"
        >
          {loading ? "..." : "Try it"}
        </button>
      </div>

      {response && (
        <pre className="px-4 py-3 bg-bg-primary text-xs text-text-secondary overflow-x-auto max-h-64 border-t border-border">
          {response}
        </pre>
      )}
    </div>
  );
}
