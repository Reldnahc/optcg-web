import { Link } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";

interface FilterEntry {
  filter: string;
  desc: string;
  example: string;
  aliases?: string[];
}

interface FilterSection {
  title: string;
  filters: FilterEntry[];
}

const FILTER_SECTIONS: FilterSection[] = [
  {
    title: "Free Text",
    filters: [
      { filter: "luffy", desc: "Free-text search for 'luffy' across name, text, set, artist, and more", example: "luffy" },
      { filter: '"Monkey D. Luffy"', desc: "Free-text phrase search. Quotes keep the words together, but this still searches more than just the card name.", example: '"Monkey D. Luffy"' },
      { filter: "text:blocker", desc: "Explicit free-text search across all indexed text fields", example: "text:blocker", aliases: ["any:blocker"] },
      { filter: "OP01-001", desc: "Typing a card number directly searches for that card", example: "OP01-001" },
      { filter: "OP01", desc: "Typing a set code directly filters to that set", example: "OP01" },
    ],
  },
  {
    title: "Card Name",
    filters: [
      { filter: "name:luffy", desc: "Card name contains 'luffy'", example: "name:luffy", aliases: ["n:luffy"] },
      { filter: 'name="Monkey D. Luffy"', desc: "Exact card name match", example: 'name="Monkey D. Luffy"', aliases: ['n="Monkey D. Luffy"'] },
    ],
  },
  {
    title: "Color",
    filters: [
      { filter: "color:red", desc: "Color includes red", example: "color:red", aliases: ["c:red"] },
      { filter: "color=red", desc: "Color is exactly red (no multicolor)", example: "color=red", aliases: ["c=red"] },
      { filter: "color:red,green", desc: "Red or green", example: "color:red,green", aliases: ["c:red,green"] },
      { filter: "color=red,green", desc: "Exactly red and green", example: "color=red,green", aliases: ["c=red,green"] },
      { filter: "-color:purple", desc: "Not purple", example: "-color:purple", aliases: ["-c:purple"] },
    ],
  },
  {
    title: "Card Type",
    filters: [
      { filter: "type:leader", desc: "Leaders", example: "type:leader", aliases: ["t:leader"] },
      { filter: "type:character", desc: "Characters", example: "type:character", aliases: ["t:character"] },
      { filter: "type:event", desc: "Events", example: "type:event", aliases: ["t:event"] },
      { filter: "type:stage", desc: "Stages", example: "type:stage", aliases: ["t:stage"] },
    ],
  },
  {
    title: "Stats",
    filters: [
      { filter: "cost>=5", desc: "Cost is 5 or more", example: "cost>=5" },
      { filter: "cost=0", desc: "Cost is exactly 0", example: "cost=0" },
      { filter: "power>6000", desc: "Power greater than 6000", example: "power>6000", aliases: ["p>6000", "pow>6000"] },
      { filter: "power<=4000", desc: "Power 4000 or less", example: "power<=4000", aliases: ["p<=4000", "pow<=4000"] },
      { filter: "counter:1000", desc: "Counter value is 1000", example: "counter:1000" },
      { filter: "life>=5", desc: "Life is 5 or more (Leaders)", example: "life>=5" },
    ],
  },
  {
    title: "Rarity",
    filters: [
      { filter: "rarity:sr", desc: "Super Rare", example: "rarity:sr", aliases: ["r:sr"] },
      { filter: "rarity:sec", desc: "Secret Rare", example: "rarity:sec", aliases: ["r:sec"] },
      { filter: "rarity:l", desc: "Leader", example: "rarity:l", aliases: ["r:l"] },
    ],
  },
  {
    title: "Set, Product & Card Number",
    filters: [
      { filter: "set:OP01", desc: "Cards from set OP01", example: "set:OP01" },
      { filter: "set:ST01", desc: "Cards from Starter Deck 01", example: "set:ST01" },
      { filter: 'product:"Romance Dawn"', desc: "Cards from a product (fuzzy match)", example: 'product:"Romance Dawn"' },
      { filter: 'product="One Piece Card the Best"', desc: "Cards from a product (exact match)", example: 'product="One Piece Card the Best"' },
      { filter: "card_number:OP01-001", desc: "Explicit card number filter", example: "card_number:OP01-001" },
      { filter: "new:OP01", desc: "Cards first appearing in set OP01", example: "new:OP01" },
    ],
  },
  {
    title: "Effect & Trigger Text",
    filters: [
      { filter: "effect:blocker", desc: "Effect text contains 'blocker'", example: "effect:blocker", aliases: ["o:blocker"] },
      { filter: 'effect:"draw 2"', desc: "Effect text contains 'draw 2'", example: 'effect:"draw 2"', aliases: ['o:"draw 2"'] },
      { filter: "effect:rush", desc: "Cards with Rush", example: "effect:rush", aliases: ["o:rush"] },
      { filter: "trigger:draw", desc: "Trigger text contains 'draw'", example: "trigger:draw" },
    ],
  },
  {
    title: "Trait & Attribute",
    filters: [
      { filter: 'trait:"Straw Hat Crew"', desc: "Has trait containing 'Straw Hat Crew'", example: 'trait:"Straw Hat Crew"', aliases: ['tr:"Straw Hat Crew"'] },
      { filter: 'trait:"Fish-Man"', desc: "Fish-Man trait", example: 'trait:"Fish-Man"', aliases: ['tr:"Fish-Man"'] },
      { filter: "attribute:strike", desc: "Attribute includes Strike", example: "attribute:strike", aliases: ["a:strike"] },
      { filter: "attribute:slash", desc: "Attribute includes Slash", example: "attribute:slash", aliases: ["a:slash"] },
      { filter: "attribute:ranged", desc: "Attribute includes Ranged", example: "attribute:ranged", aliases: ["a:ranged"] },
    ],
  },
  {
    title: "Block & Artist",
    filters: [
      { filter: "block:1", desc: "Cards in block 1", example: "block:1" },
      { filter: 'artist:"Peach Momoko"', desc: "Variant artist name contains 'Peach Momoko'", example: 'artist:"Peach Momoko"' },
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
      { filter: "is:sp", desc: "Cards with an SP variant", example: "is:sp" },
      { filter: "is:alt", desc: "Cards with an Alternate Art variant", example: "is:alt" },
      { filter: "is:manga", desc: "Cards with a Manga Art variant", example: "is:manga" },
      { filter: "is:fullart", desc: "Cards with a Full Art variant (alias: fa)", example: "is:fullart" },
      { filter: "is:tr", desc: "Cards with a TR variant", example: "is:tr" },
      { filter: "not:reprint", desc: "Not a reprint (shorthand for -is:reprint)", example: "not:reprint" },
      { filter: "has:trigger", desc: "Cards with a trigger effect", example: "has:trigger" },
      { filter: "has:effect", desc: "Non-vanilla cards", example: "has:effect" },
      { filter: "has:price", desc: "Cards with TCGPlayer price data", example: "has:price" },
      { filter: "has:sp", desc: "Card has any SP printing", example: "has:sp" },
      { filter: "has:alt", desc: "Card has any Alternate Art printing", example: "has:alt" },
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
  { value: "card_number", desc: "Card number (default). Aliases: number, set", example: "order:card_number" },
  { value: "name", desc: "Card name alphabetically", example: "order:name" },
  { value: "cost", desc: "Cost value", example: "order:cost" },
  { value: "power", desc: "Power value", example: "order:power" },
  { value: "released", desc: "Release date", example: "order:released" },
  { value: "rarity", desc: "Rarity", example: "order:rarity" },
  { value: "color", desc: "Color", example: "order:color" },
  { value: "artist", desc: "Artist name from the best matching print", example: "order:artist" },
  { value: "market_price", desc: "TCGPlayer market price. Alias: usd", example: "order:market_price" },
  { value: "relevance", desc: "Relevance ranking (only with a search query)", example: "luffy order:relevance" },
];

const SORT_EXAMPLES = [
  { query: "color:red order:cost direction:asc", desc: "Red cards sorted by cost, lowest first", example: "color:red order:cost direction:asc", aliases: ["c:red sort:cost dir:asc"] },
  { query: "color:red order:cost direction:desc", desc: "Red cards sorted by cost, highest first", example: "color:red order:cost direction:desc", aliases: ["c:red sort:cost dir:desc"] },
  { query: "type:leader order:name", desc: "Leaders sorted by name A-Z", example: "type:leader order:name", aliases: ["t:leader sort:name"] },
  { query: "set:OP01 order:power dir:desc", desc: "OP01 cards by highest power", example: "set:OP01 order:power dir:desc" },
  { query: "has:price order:market_price dir:desc", desc: "Most expensive cards first", example: "has:price order:market_price dir:desc" },
  { query: "order:released dir:desc", desc: "Newest releases first", example: "order:released dir:desc" },
];

const COMBO_EXAMPLES = [
  { query: 'color:red type:character cost<=3 effect:"draw"', desc: "Cheap red characters that draw cards", example: 'color:red type:character cost<=3 effect:"draw"', aliases: ['c:red t:character cost<=3 o:"draw"'] },
  { query: "set:OP01 rarity:sr is:multicolor", desc: "Multicolor Super Rares from OP01", example: "set:OP01 rarity:sr is:multicolor", aliases: ["set:OP01 r:sr is:multicolor"] },
  { query: "type:leader life>=5 color:red,green", desc: "Red or green Leaders with 5+ life", example: "type:leader life>=5 color:red,green", aliases: ["t:leader life>=5 c:red,green"] },
  { query: "legal:standard effect:blocker power>=6000", desc: "Standard-legal blockers with 6000+ power", example: "legal:standard effect:blocker power>=6000", aliases: ["legal:standard o:blocker power>=6000"] },
  { query: 'trait:"Straw Hat Crew" -type:leader -type:event', desc: "Straw Hat characters and stages", example: 'trait:"Straw Hat Crew" -type:leader -type:event', aliases: ['trait:"Straw Hat Crew" -t:leader -t:event'] },
  { query: "prints>=3 rarity:sr", desc: "Super Rares with 3+ printings", example: "prints>=3 rarity:sr", aliases: ["prints>=3 r:sr"] },
];

const FIELD_ALIAS_ROWS = [
  { full: "name", aliases: ["n"], sample: "name:luffy", shortSample: "n:luffy" },
  { full: "color", aliases: ["c"], sample: "color:red", shortSample: "c:red" },
  { full: "type", aliases: ["t"], sample: "type:leader", shortSample: "t:leader" },
  { full: "power", aliases: ["p", "pow"], sample: "power>6000", shortSample: "p>6000 / pow>6000" },
  { full: "rarity", aliases: ["r"], sample: "rarity:sr", shortSample: "r:sr" },
  { full: "text", aliases: ["any"], sample: "text:blocker", shortSample: "any:blocker" },
  { full: "effect", aliases: ["o"], sample: "effect:blocker", shortSample: "o:blocker" },
  { full: "trait", aliases: ["tr"], sample: 'trait:"Straw Hat Crew"', shortSample: 'tr:"Straw Hat Crew"' },
  { full: "attribute", aliases: ["a"], sample: "attribute:slash", shortSample: "a:slash" },
  { full: "order", aliases: ["sort"], sample: "order:power", shortSample: "sort:power" },
  { full: "direction", aliases: ["dir"], sample: "direction:desc", shortSample: "dir:desc" },
];

const FREE_SEARCH_QUICKSTART = [
  {
    title: "Bare words are broad",
    body: <>Typing <code className="text-accent">luffy</code> is not just a name search. It can match card names, effect text, traits, artist names, set names or codes, and other indexed fields.</>,
  },
  {
    title: "Quoted phrases stay together",
    body: <>Use quotes when the words should stay as one phrase, like <code className="text-accent">"Monkey D. Luffy"</code> or <code className="text-accent">"draw 2"</code>.</>,
  },
  {
    title: "Use field filters when you mean one field",
    body: <>If you only want card names, use <code className="text-accent">name:</code>. If you only want effect text, use <code className="text-accent">o:</code>. Free search is intentionally wider than that.</>,
  },
  {
    title: "Mix free search with filters",
    body: <>Free search is a good starting point when you know text but not structure. Once you know what field matters, add filters to narrow it down.</>,
  },
];

const FREE_SEARCH_EXAMPLES = [
  { code: "luffy", desc: "Finds cards related to Luffy, not just cards named Luffy", example: "luffy" },
  { code: '"Monkey D. Luffy"', desc: "Searches that exact phrase across indexed text fields", example: '"Monkey D. Luffy"' },
  { code: "blocker", desc: "Good when you only know a keyword from effect text", example: "blocker" },
  { code: '"draw 2"', desc: "Good for exact rules-text phrases", example: '"draw 2"' },
  { code: "straw hat", desc: "Broad match for names, traits, and related text", example: "straw hat" },
  { code: "op01", desc: "Typing a set code directly is often enough", example: "op01" },
  { code: "peach momoko", desc: "Can surface cards by matching artist text", example: "peach momoko" },
];

export function SyntaxHelp() {
  return (
    <PageContainer
      title="Search Syntax"
      subtitle={<>Use these filters in the search bar to find exactly the cards you need. You can also use the <Link to="/advanced" className="text-link hover:text-link-hover">Advanced Search</Link> page to build queries visually.</>}
    >
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">How Free Search Works</h2>
        <div className="rounded-xl border border-border bg-bg-card p-4 sm:p-5">
          <p className="text-sm leading-relaxed text-text-secondary">
            Start simple: you can type plain words straight into search without any operators. That free search is intentionally broad and is usually the fastest way to find a card when you only know part of a name, a phrase from the effect, a trait, an artist, or a set.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {FREE_SEARCH_QUICKSTART.map((item) => (
              <div key={item.title} className="rounded-lg border border-border/70 bg-bg-primary/20 p-3">
                <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-border/70 bg-bg-primary/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Rule of thumb</p>
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">
              If you are exploring, start with free search. If you know exactly which field you mean, switch to a field filter like <code className="text-accent">name:</code>, <code className="text-accent">o:</code>, <code className="text-accent">trait:</code>, <code className="text-accent">artist:</code>, or <code className="text-accent">set:</code>.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-text-secondary mb-2">Free Search Examples</h3>
          <div className="bg-bg-card border border-border rounded-lg divide-y divide-border">
            {FREE_SEARCH_EXAMPLES.map((example) => (
              <QueryExampleRow key={example.code} code={example.code} desc={example.desc} example={example.example} />
            ))}
          </div>
        </div>
      </section>

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
        <h2 className="text-lg font-semibold mb-3">Short &amp; Long Forms</h2>
        <p className="text-sm text-text-secondary mb-3">
          Short aliases and long field names work the same way. The long form is usually easier to learn; the short form is just faster to type once you know it.
        </p>
        <div className="bg-bg-card border border-border rounded-lg divide-y divide-border mb-4">
          {FIELD_ALIAS_ROWS.map((row) => (
            <FieldAliasExampleRow key={row.full} full={row.full} aliases={row.aliases} sample={row.sample} shortSample={row.shortSample} />
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
          Sort results using the controls on the search page, URL parameters, or inline in the query with <code className="text-accent">order:</code> (alias: <code className="text-accent">sort:</code>) and <code className="text-accent">dir:</code>.
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
            <QueryExampleRow key={s.query} code={s.query} desc={s.desc} example={s.example} aliases={s.aliases} />
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
            <QueryExampleRow key={e.query} code={e.query} desc={e.desc} example={e.example} aliases={e.aliases} />
          ))}
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
  aliases,
  codeWidthClass,
  rawQuery = false,
}: {
  code: string;
  desc: string;
  example: string;
  aliases?: string[];
  codeWidthClass?: string;
  rawQuery?: boolean;
}) {
  const to = rawQuery ? `/search?q=${example}` : `/search?q=${encodeURIComponent(example)}`;

  return (
    <div className="px-4 py-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className={`self-start ${codeWidthClass ?? ""}`}>
          <code className="text-accent font-mono text-[13px] break-all rounded bg-bg-primary/60 px-2 py-1 self-start sm:text-sm sm:break-normal sm:bg-transparent sm:px-0 sm:py-0">
            {code}
          </code>
          {aliases && aliases.length > 0 ? (
            <div className="mt-1 text-[11px] text-text-muted sm:text-xs">
              also:{" "}
              {aliases.map((alias, index) => (
                <span key={alias}>
                  <code className="text-text-secondary">{alias}</code>
                  {index < aliases.length - 1 ? ", " : ""}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <span className="text-text-secondary">{desc}</span>
      </div>
      <Link to={to} className="text-xs text-link hover:text-link-hover self-start shrink-0 sm:ml-2">
        try it
      </Link>
    </div>
  );
}

function FieldAliasExampleRow({
  full,
  aliases,
  sample,
  shortSample,
}: {
  full: string;
  aliases: string[];
  sample: string;
  shortSample: string;
}) {
  return (
    <div className="px-4 py-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-text-primary font-mono">{full}</code>
          <span className="text-text-muted">↔</span>
          <code className="text-accent font-mono">{aliases.join(", ")}</code>
        </div>
        <div className="mt-1 text-xs text-text-muted">
          long: <code className="text-text-secondary">{sample}</code>
          {"  "}
          short: <code className="text-text-secondary">{shortSample}</code>
        </div>
      </div>
    </div>
  );
}
