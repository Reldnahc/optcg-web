import { Link } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";

interface FilterEntry {
  filter: string;
  desc: string;
  example: string;
}

interface FilterSection {
  title: string;
  filters: FilterEntry[];
}

const FILTER_SECTIONS: FilterSection[] = [
  {
    title: "Card Name",
    filters: [
      { filter: "luffy", desc: "Free-text search for 'luffy' across name, text, set, product, artist, and more", example: "luffy" },
      { filter: '"Monkey D. Luffy"', desc: "Free-text phrase search. Quotes keep the words together, but this still searches more than just the card name.", example: '"Monkey D. Luffy"' },
      { filter: "name:luffy", desc: "Card name contains 'luffy'", example: "name:luffy" },
      { filter: 'name="Monkey D. Luffy"', desc: "Exact card name match", example: 'name="Monkey D. Luffy"' },
      { filter: "n:luffy", desc: "Short alias: card name includes 'luffy'", example: "n:luffy" },
      { filter: 'n="Monkey D. Luffy"', desc: "Short alias: exact card name match", example: 'n="Monkey D. Luffy"' },
    ],
  },
  {
    title: "Color",
    filters: [
      { filter: "c:red", desc: "Color includes red", example: "c:red" },
      { filter: "c=red", desc: "Color is exactly red (no multicolor)", example: "c=red" },
      { filter: "c:red,green", desc: "Has both red and green", example: "c:red,green" },
      { filter: "c=red,green", desc: "Exactly red and green", example: "c=red,green" },
      { filter: "-c:purple", desc: "Not purple", example: "-c:purple" },
    ],
  },
  {
    title: "Card Type",
    filters: [
      { filter: "t:leader", desc: "Leaders", example: "t:leader" },
      { filter: "t:character", desc: "Characters", example: "t:character" },
      { filter: "t:event", desc: "Events", example: "t:event" },
      { filter: "t:stage", desc: "Stages", example: "t:stage" },
    ],
  },
  {
    title: "Stats",
    filters: [
      { filter: "cost>=5", desc: "Cost is 5 or more", example: "cost>=5" },
      { filter: "cost=0", desc: "Cost is exactly 0", example: "cost=0" },
      { filter: "power>6000", desc: "Power greater than 6000", example: "power>6000" },
      { filter: "power<=4000", desc: "Power 4000 or less", example: "power<=4000" },
      { filter: "counter:1000", desc: "Counter value is 1000", example: "counter:1000" },
      { filter: "life>=5", desc: "Life is 5 or more (Leaders)", example: "life>=5" },
    ],
  },
  {
    title: "Rarity",
    filters: [
      { filter: "r:sr", desc: "Super Rare", example: "r:sr" },
      { filter: "r:sec", desc: "Secret Rare", example: "r:sec" },
      { filter: "r:l", desc: "Leader", example: "r:l" },
    ],
  },
  {
    title: "Set & Product",
    filters: [
      { filter: "set:OP01", desc: "Cards from set OP01", example: "set:OP01" },
      { filter: "set:ST01", desc: "Cards from Starter Deck 01", example: "set:ST01" },
      { filter: 'product:"Romance Dawn"', desc: "Cards from a product (fuzzy match)", example: 'product:"Romance Dawn"' },
      { filter: 'product="One Piece Card the Best"', desc: "Cards from a product (exact match)", example: 'product="One Piece Card the Best"' },
    ],
  },
  {
    title: "Effect & Trigger Text",
    filters: [
      { filter: "o:blocker", desc: "Effect text contains 'blocker'", example: "o:blocker" },
      { filter: 'o:"draw 2"', desc: "Effect text contains 'draw 2'", example: 'o:"draw 2"' },
      { filter: "o:rush", desc: "Cards with Rush", example: "o:rush" },
      { filter: "trigger:draw", desc: "Trigger text contains 'draw'", example: "trigger:draw" },
    ],
  },
  {
    title: "Trait & Attribute",
    filters: [
      { filter: 'trait:"Straw Hat Crew"', desc: "Has trait containing 'Straw Hat Crew'", example: 'trait:"Straw Hat Crew"' },
      { filter: 'trait:"Fish-Man"', desc: "Fish-Man trait", example: 'trait:"Fish-Man"' },
      { filter: "a:strike", desc: "Attribute includes Strike", example: "a:strike" },
      { filter: "a:slash", desc: "Attribute includes Slash", example: "a:slash" },
      { filter: "a:ranged", desc: "Attribute includes Ranged", example: "a:ranged" },
    ],
  },
  {
    title: "Block & Artist",
    filters: [
      { filter: "block:1", desc: "Cards in block 1", example: "block:1" },
      { filter: "artist:oda", desc: "Variant artist name contains 'oda'", example: "artist:oda" },
    ],
  },
  {
    title: "Legality",
    filters: [
      { filter: "legal:standard", desc: "Legal in Standard format", example: "legal:standard" },
      { filter: 'legal:"extra regulation"', desc: "Legal in Extra Regulation", example: 'legal:"extra regulation"' },
      { filter: "banned:standard", desc: "Banned in Standard format", example: "banned:standard" },
      { filter: "-legal:standard", desc: "Not legal in Standard", example: "-legal:standard" },
    ],
  },
  {
    title: "Boolean Properties",
    filters: [
      { filter: "is:multicolor", desc: "Multi-color cards", example: "is:multicolor" },
      { filter: "is:vanilla", desc: "Cards with no effect text", example: "is:vanilla" },
      { filter: "is:reprint", desc: "Cards that are reprints", example: "is:reprint" },
      { filter: "has:trigger", desc: "Cards with a trigger effect", example: "has:trigger" },
      { filter: "has:effect", desc: "Non-vanilla cards", example: "has:effect" },
      { filter: "has:price", desc: "Cards with TCGPlayer price data", example: "has:price" },
    ],
  },
  {
    title: "Price",
    filters: [
      { filter: "usd>=10", desc: "Market price $10 or more", example: "usd>=10" },
      { filter: "usd<1", desc: "Market price under $1", example: "usd<1" },
    ],
  },
  {
    title: "Release Date",
    filters: [
      { filter: "year:2024", desc: "Released in 2024", example: "year:2024" },
      { filter: "date>=2024-01-01", desc: "Released on or after Jan 1 2024", example: "date>=2024-01-01" },
      { filter: "date<2023-01-01", desc: "Released before 2023", example: "date<2023-01-01" },
    ],
  },
  {
    title: "Print Count",
    filters: [
      { filter: "prints>=2", desc: "Cards with 2+ printings", example: "prints>=2" },
      { filter: "prints=1", desc: "Cards with only 1 printing", example: "prints=1" },
    ],
  },
];

const OPERATORS = [
  { op: ":", desc: "Contains / includes (default)" },
  { op: "=", desc: "Exact match" },
  { op: ">=", desc: "Greater than or equal" },
  { op: "<=", desc: "Less than or equal" },
  { op: ">", desc: "Greater than" },
  { op: "<", desc: "Less than" },
  { op: "!=", desc: "Not equal" },
];

const LOGIC = [
  { syntax: "luffy c:red", desc: "Both conditions (implicit AND)", example: "luffy c:red" },
  { syntax: "luffy OR zoro", desc: "Either condition", example: "luffy OR zoro" },
  { syntax: "(c:red OR c:green) t:leader", desc: "Grouping with parentheses", example: "(c:red OR c:green) t:leader" },
  { syntax: "-c:red", desc: "Negate a filter (NOT red)", example: "-c:red" },
  { syntax: "-is:vanilla o:blocker", desc: "Non-vanilla blockers", example: "-is:vanilla o:blocker" },
];

const SORT_FIELDS = [
  { value: "card_number", desc: "Card number (default)", example: "order:card_number" },
  { value: "name", desc: "Card name alphabetically", example: "order:name" },
  { value: "cost", desc: "Cost value", example: "order:cost" },
  { value: "power", desc: "Power value", example: "order:power" },
  { value: "released", desc: "Release date", example: "order:released" },
  { value: "rarity", desc: "Rarity", example: "order:rarity" },
  { value: "color", desc: "Color", example: "order:color" },
  { value: "artist", desc: "Artist name from the best matching print", example: "order:artist" },
  { value: "market_price", desc: "TCGPlayer market price", example: "order:market_price" },
];

const SORT_EXAMPLES = [
  { query: "c:red order:cost dir:asc", desc: "Red cards sorted by cost, lowest first", example: "c:red order:cost dir:asc" },
  { query: "c:red order:cost dir:desc", desc: "Red cards sorted by cost, highest first", example: "c:red order:cost dir:desc" },
  { query: "t:leader order:name", desc: "Leaders sorted by name A-Z", example: "t:leader order:name" },
  { query: "set:OP01 order:power dir:desc", desc: "OP01 cards by highest power", example: "set:OP01 order:power dir:desc" },
  { query: "has:price order:market_price dir:desc", desc: "Most expensive cards first", example: "has:price order:market_price dir:desc" },
  { query: "order:released dir:desc", desc: "Newest releases first", example: "order:released dir:desc" },
];

const COMBO_EXAMPLES = [
  { query: 'c:red t:character cost<=3 o:"draw"', desc: "Cheap red characters that draw cards", example: 'c:red t:character cost<=3 o:"draw"' },
  { query: "set:OP01 r:sr is:multicolor", desc: "Multicolor Super Rares from OP01", example: "set:OP01 r:sr is:multicolor" },
  { query: "t:leader life>=5 (c:red OR c:green)", desc: "Red or green Leaders with 5+ life", example: "t:leader life>=5 (c:red OR c:green)" },
  { query: "legal:standard o:blocker power>=6000", desc: "Standard-legal blockers with 6000+ power", example: "legal:standard o:blocker power>=6000" },
  { query: 'trait:"Straw Hat Crew" -t:leader -t:event', desc: "Straw Hat characters and stages", example: 'trait:"Straw Hat Crew" -t:leader -t:event' },
  { query: "prints>=3 r:sr", desc: "Super Rares with 3+ printings", example: "prints>=3 r:sr" },
];

export function SyntaxHelp() {
  return (
    <PageContainer
      title="Search Syntax"
      subtitle={<>Use these filters in the search bar to find exactly the cards you need. You can also use the <Link to="/advanced" className="text-link hover:text-link-hover">Advanced Search</Link> page to build queries visually.</>}
    >
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Operators</h2>
        <div className="bg-bg-card border border-border rounded-lg divide-y divide-border">
          {OPERATORS.map((o) => (
            <SimpleRow key={o.op} code={o.op} desc={o.desc} codeWidthClass="sm:w-8" />
          ))}
        </div>
        <p className="text-xs text-text-muted mt-2 leading-relaxed">
          Not all operators apply to every field. Text fields use <code className="text-accent">:</code> for substring matching and <code className="text-accent">=</code> for exact matching. Numeric fields support all comparison operators.
        </p>
        <p className="text-xs text-text-muted mt-2 leading-relaxed">
          Bare words and quoted phrases are free-text searches. To search only the card name, use <code className="text-accent">name:</code>/<code className="text-accent">name=</code> or the short alias <code className="text-accent">n:</code>/<code className="text-accent">n=</code>.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Boolean Logic</h2>
        <div className="bg-bg-card border border-border rounded-lg divide-y divide-border">
          {LOGIC.map((l) => (
            <QueryExampleRow key={l.syntax} code={l.syntax} desc={l.desc} example={l.example} codeWidthClass="sm:min-w-[240px]" />
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Filters</h2>
        <div className="space-y-6">
          {FILTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-text-secondary mb-2">{section.title}</h3>
              <div className="bg-bg-card border border-border rounded-lg divide-y divide-border">
                {section.filters.map((f) => (
                  <QueryExampleRow key={f.filter} code={f.filter} desc={f.desc} example={f.example} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Display Modes</h2>
        <p className="text-sm text-text-secondary mb-3">
          Control how results are displayed using the controls on the search results page or URL parameters.
        </p>

        <h3 className="text-sm font-semibold text-text-secondary mb-2">Uniqueness</h3>
        <div className="bg-bg-card border border-border rounded-lg divide-y divide-border mb-4">
          <QueryExampleRow code="unique=prints" desc="Each variant (Standard, Alternate Art, etc.) is a separate result (default)" example="set:OP01&unique=prints" rawQuery codeWidthClass="sm:min-w-[140px]" />
          <QueryExampleRow code="unique=cards" desc="One result per card number, regardless of how many variants exist" example="set:OP01&unique=cards" rawQuery codeWidthClass="sm:min-w-[140px]" />
        </div>

        <h3 className="text-sm font-semibold text-text-secondary mb-2">View</h3>
        <div className="bg-bg-card border border-border rounded-lg divide-y divide-border">
          <QueryExampleRow code="as=images" desc="Image grid with card thumbnails (default)" example="set:OP01&as=images" rawQuery codeWidthClass="sm:min-w-[140px]" />
          <QueryExampleRow code="as=checklist" desc="Compact table with card details" example="set:OP01&as=checklist" rawQuery codeWidthClass="sm:min-w-[140px]" />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Sorting</h2>
        <p className="text-sm text-text-secondary mb-3">
          Sort results using the controls on the search page, URL parameters, or inline in the query with <code className="text-accent">order:</code> and <code className="text-accent">dir:</code>.
        </p>

        <h3 className="text-sm font-semibold text-text-secondary mb-2">Sort Fields</h3>
        <div className="bg-bg-card border border-border rounded-lg divide-y divide-border mb-4">
          {SORT_FIELDS.map((s) => (
            <QueryExampleRow key={s.value} code={s.value} desc={s.desc} example={s.example} codeWidthClass="sm:min-w-[120px]" />
          ))}
        </div>

        <h3 className="text-sm font-semibold text-text-secondary mb-2">Direction</h3>
        <div className="bg-bg-card border border-border rounded-lg divide-y divide-border mb-4">
          <SimpleRow code="dir:asc" desc="Ascending - lowest first, A to Z, oldest first (default)" codeWidthClass="sm:min-w-[120px]" />
          <SimpleRow code="dir:desc" desc="Descending - highest first, Z to A, newest first" codeWidthClass="sm:min-w-[120px]" />
        </div>

        <h3 className="text-sm font-semibold text-text-secondary mb-2">Examples</h3>
        <div className="bg-bg-card border border-border rounded-lg divide-y divide-border">
          {SORT_EXAMPLES.map((s) => (
            <QueryExampleRow key={s.query} code={s.query} desc={s.desc} example={s.example} />
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Example Queries</h2>
        <p className="text-sm text-text-secondary mb-3">
          Combine multiple filters to build powerful searches:
        </p>
        <div className="bg-bg-card border border-border rounded-lg divide-y divide-border">
          {COMBO_EXAMPLES.map((e) => (
            <QueryExampleRow key={e.query} code={e.query} desc={e.desc} example={e.example} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Field Aliases</h2>
        <p className="text-sm text-text-secondary mb-3">
          Many fields have shorter aliases for convenience:
        </p>
        <div className="bg-bg-card border border-border rounded-lg divide-y divide-border text-sm">
          <AliasRow short="n" full="name" />
          <AliasRow short="c" full="color" />
          <AliasRow short="t" full="type" />
          <AliasRow short="r" full="rarity" />
          <AliasRow short="o" full="effect" />
          <AliasRow short="a" full="attribute" />
          <AliasRow short="tr" full="trait" />
          <AliasRow short="pow" full="power" />
        </div>
      </section>
    </PageContainer>
  );
}

function SimpleRow({
  code,
  desc,
  codeWidthClass,
}: {
  code: string;
  desc: string;
  codeWidthClass?: string;
}) {
  return (
    <div className="px-4 py-3 flex flex-col gap-1.5 text-sm sm:flex-row sm:items-center sm:gap-4">
      <code className={`text-accent font-mono rounded bg-bg-primary/60 px-2 py-1 self-start sm:bg-transparent sm:px-0 sm:py-0 ${codeWidthClass ?? ""}`}>
        {code}
      </code>
      <span className="text-text-secondary">{desc}</span>
    </div>
  );
}

function QueryExampleRow({
  code,
  desc,
  example,
  codeWidthClass,
  rawQuery = false,
}: {
  code: string;
  desc: string;
  example: string;
  codeWidthClass?: string;
  rawQuery?: boolean;
}) {
  const to = rawQuery ? `/search?q=${example}` : `/search?q=${encodeURIComponent(example)}`;

  return (
    <div className="px-4 py-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <code className={`text-accent font-mono text-[13px] break-all rounded bg-bg-primary/60 px-2 py-1 self-start sm:text-sm sm:break-normal sm:bg-transparent sm:px-0 sm:py-0 ${codeWidthClass ?? ""}`}>
          {code}
        </code>
        <span className="text-text-secondary">{desc}</span>
      </div>
      <Link to={to} className="text-xs text-link hover:text-link-hover self-start shrink-0 sm:ml-2">
        try it
      </Link>
    </div>
  );
}

function AliasRow({ short, full }: { short: string; full: string }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <code className="text-accent font-mono rounded bg-bg-primary/60 px-2 py-1 w-10 text-center sm:w-8 sm:bg-transparent sm:px-0 sm:py-0">{short}</code>
      <span className="text-text-muted">&rarr;</span>
      <code className="text-text-primary font-mono break-all">{full}</code>
    </div>
  );
}
