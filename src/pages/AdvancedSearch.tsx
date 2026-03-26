import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "../components/layout/PageContainer";

type TextOp = ":" | "=";
type ComparisonOp = "=" | ">=" | "<=" | ">" | "<";

const COLOR_OPTIONS = [
  { value: "red", label: "Red" },
  { value: "green", label: "Green" },
  { value: "blue", label: "Blue" },
  { value: "purple", label: "Purple" },
  { value: "black", label: "Black" },
  { value: "yellow", label: "Yellow" },
];

const BOOLEAN_FILTER_OPTIONS = [
  { value: "is:multicolor", label: "Multicolor" },
  { value: "is:vanilla", label: "Vanilla" },
  { value: "is:reprint", label: "Reprint" },
  { value: "has:trigger", label: "Has Trigger" },
  { value: "has:effect", label: "Has Effect" },
  { value: "has:price", label: "Has Price" },
];

const TYPE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "Leader", label: "Leader" },
  { value: "Character", label: "Character" },
  { value: "Event", label: "Event" },
  { value: "Stage", label: "Stage" },
];

const RARITY_OPTIONS = [
  { value: "", label: "Any" },
  { value: "C", label: "Common (C)" },
  { value: "UC", label: "Uncommon (UC)" },
  { value: "R", label: "Rare (R)" },
  { value: "SR", label: "Super Rare (SR)" },
  { value: "SEC", label: "Secret (SEC)" },
  { value: "L", label: "Leader (L)" },
];

const ATTRIBUTE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "Strike", label: "Strike" },
  { value: "Slash", label: "Slash" },
  { value: "Special", label: "Special" },
  { value: "Wisdom", label: "Wisdom" },
  { value: "Ranged", label: "Ranged" },
];

const FORMAT_OPTIONS = [
  { value: "", label: "Any" },
  { value: "Standard", label: "Standard" },
  { value: "Extra Regulation", label: "Extra Regulation" },
];

const TEXT_MODE_OPTIONS = [
  { value: ":", label: "Contains" },
  { value: "=", label: "Exact" },
];

const COMPARISON_OPTIONS = [
  { value: "=", label: "=" },
  { value: ">=", label: ">=" },
  { value: "<=", label: "<=" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
];

export function AdvancedSearch() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [nameMode, setNameMode] = useState<TextOp>(":");
  const [effect, setEffect] = useState("");
  const [effectMode, setEffectMode] = useState<TextOp>(":");
  const [trigger, setTrigger] = useState("");
  const [triggerMode, setTriggerMode] = useState<TextOp>(":");
  const [type, setType] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  const [colorMode, setColorMode] = useState<":" | "=">(":");
  const [rarity, setRarity] = useState("");
  const [set, setSet] = useState("");
  const [product, setProduct] = useState("");
  const [productMode, setProductMode] = useState<TextOp>(":");
  const [trait, setTrait] = useState("");
  const [traitMode, setTraitMode] = useState<TextOp>(":");
  const [attribute, setAttribute] = useState("");
  const [artist, setArtist] = useState("");
  const [artistMode, setArtistMode] = useState<TextOp>(":");
  const [costOp, setCostOp] = useState<ComparisonOp>("=");
  const [cost, setCost] = useState("");
  const [powerOp, setPowerOp] = useState<ComparisonOp>("=");
  const [power, setPower] = useState("");
  const [counterOp, setCounterOp] = useState<ComparisonOp>("=");
  const [counter, setCounter] = useState("");
  const [lifeOp, setLifeOp] = useState<ComparisonOp>("=");
  const [life, setLife] = useState("");
  const [usdOp, setUsdOp] = useState<ComparisonOp>(">=");
  const [usd, setUsd] = useState("");
  const [printsOp, setPrintsOp] = useState<ComparisonOp>(">=");
  const [prints, setPrints] = useState("");
  const [block, setBlock] = useState("");
  const [legal, setLegal] = useState("");
  const [banned, setBanned] = useState("");
  const [year, setYear] = useState("");
  const [dateOp, setDateOp] = useState<ComparisonOp>(">=");
  const [releaseDate, setReleaseDate] = useState("");
  const [booleanFilters, setBooleanFilters] = useState<string[]>([]);
  const [rawSyntax, setRawSyntax] = useState("");

  const toggleColor = (value: string) => {
    setColors((prev) => (prev.includes(value) ? prev.filter((entry) => entry !== value) : [...prev, value]));
  };

  const toggleBooleanFilter = (value: string) => {
    setBooleanFilters((prev) => (prev.includes(value) ? prev.filter((entry) => entry !== value) : [...prev, value]));
  };

  const buildQuery = () => {
    const parts: string[] = [];

    if (name.trim()) {
      parts.push(formatNameClause(name.trim(), nameMode));
    }

    pushTextClause(parts, "o", effect, effectMode);
    pushTextClause(parts, "trigger", trigger, triggerMode);

    if (type) parts.push(`t:${type}`);
    if (colors.length > 0) parts.push(`c${colorMode}${colors.join(",")}`);
    if (rarity) parts.push(`r:${rarity}`);
    if (set.trim()) parts.push(`set:${set.trim()}`);

    pushTextClause(parts, "product", product, productMode);
    pushTextClause(parts, "trait", trait, traitMode);

    if (attribute) parts.push(`a:${attribute}`);

    pushTextClause(parts, "artist", artist, artistMode);

    pushNumericClause(parts, "cost", cost, costOp);
    pushNumericClause(parts, "power", power, powerOp);
    pushNumericClause(parts, "counter", counter, counterOp);
    pushNumericClause(parts, "life", life, lifeOp);
    pushNumericClause(parts, "usd", usd, usdOp);
    pushNumericClause(parts, "prints", prints, printsOp);

    if (block.trim()) parts.push(`block:${block.trim()}`);
    if (legal) parts.push(`legal:${formatFieldValue(legal)}`);
    if (banned) parts.push(`banned:${formatFieldValue(banned)}`);
    if (year.trim()) parts.push(`year:${year.trim()}`);
    if (releaseDate) parts.push(`date${dateOp}${releaseDate}`);

    BOOLEAN_FILTER_OPTIONS.forEach((option) => {
      if (booleanFilters.includes(option.value)) {
        parts.push(option.value);
      }
    });

    if (rawSyntax.trim()) parts.push(rawSyntax.trim());

    return parts.join(" ");
  };

  const query = buildQuery().trim();
  const canSubmit = Boolean(query);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    const params = new URLSearchParams();
    if (query) params.set("q", query);

    navigate(`/search?${params.toString()}`);
  };

  return (
    <PageContainer
      title="Advanced Search"
      subtitle="Build a search visually, then add raw syntax for OR groups, negation, or anything else the form does not model directly."
    >
      <form onSubmit={submit} className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Text Filters</h2>

          <TextMatchField
            label="Card Name"
            value={name}
            onChange={setName}
            mode={nameMode}
            onModeChange={setNameMode}
            placeholder="e.g. Luffy"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <TextMatchField
              label="Effect Text"
              value={effect}
              onChange={setEffect}
              mode={effectMode}
              onModeChange={setEffectMode}
              placeholder="e.g. blocker"
            />
            <TextMatchField
              label="Trigger Text"
              value={trigger}
              onChange={setTrigger}
              mode={triggerMode}
              onModeChange={setTriggerMode}
              placeholder="e.g. draw"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Card Type">
              <Select value={type} onChange={setType} options={TYPE_OPTIONS} />
            </Field>
            <Field label="Rarity">
              <Select value={rarity} onChange={setRarity} options={RARITY_OPTIONS} />
            </Field>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-5">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Card Details</h2>

          <Field label="Color">
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_OPTIONS.map((option) => (
                <ToggleChip
                  key={option.value}
                  active={colors.includes(option.value)}
                  onClick={() => toggleColor(option.value)}
                  label={option.label}
                />
              ))}
              {colors.length > 0 && (
                <select
                  value={colorMode}
                  onChange={(e) => setColorMode(e.target.value as ":" | "=")}
                  className="ml-1 bg-bg-input border border-border rounded px-2 py-1 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
                >
                  <option value=":">Includes all selected</option>
                  <option value="=">Exactly these colors</option>
                </select>
              )}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Set Code">
              <TextInput value={set} onChange={setSet} placeholder="e.g. OP07" />
            </Field>
            <TextMatchField
              label="Product"
              value={product}
              onChange={setProduct}
              mode={productMode}
              onModeChange={setProductMode}
              placeholder="e.g. 500 Years in the Future"
            />
            <TextMatchField
              label="Trait"
              value={trait}
              onChange={setTrait}
              mode={traitMode}
              onModeChange={setTraitMode}
              placeholder="e.g. Straw Hat Crew"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Attribute">
              <Select value={attribute} onChange={setAttribute} options={ATTRIBUTE_OPTIONS} />
            </Field>
            <TextMatchField
              label="Artist"
              value={artist}
              onChange={setArtist}
              mode={artistMode}
              onModeChange={setArtistMode}
              placeholder="e.g. Oda (matches variant artist)"
            />
            <Field label="Block">
              <TextInput value={block} onChange={setBlock} placeholder="e.g. 2" />
            </Field>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-5">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Numeric Filters</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NumericField label="Cost" value={cost} onChange={setCost} op={costOp} onOpChange={setCostOp} />
            <NumericField label="Power" value={power} onChange={setPower} op={powerOp} onOpChange={setPowerOp} />
            <NumericField label="Counter" value={counter} onChange={setCounter} op={counterOp} onOpChange={setCounterOp} />
            <NumericField label="Life" value={life} onChange={setLife} op={lifeOp} onOpChange={setLifeOp} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <NumericField label="Price (USD)" value={usd} onChange={setUsd} op={usdOp} onOpChange={setUsdOp} />
            <NumericField label="Print Count" value={prints} onChange={setPrints} op={printsOp} onOpChange={setPrintsOp} />
            <Field label="Release Year">
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2024"
                className="w-full bg-bg-input border border-border rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
              />
            </Field>
          </div>

          <DateField label="Release Date" value={releaseDate} onChange={setReleaseDate} op={dateOp} onOpChange={setDateOp} />
        </section>

        <section className="space-y-4 border-t border-border pt-5">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Status Filters</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Legal in Format">
              <Select value={legal} onChange={setLegal} options={FORMAT_OPTIONS} />
            </Field>
            <Field label="Banned in Format">
              <Select value={banned} onChange={setBanned} options={FORMAT_OPTIONS} />
            </Field>
          </div>

          <Field label="Boolean Filters">
            <div className="flex flex-wrap gap-2">
              {BOOLEAN_FILTER_OPTIONS.map((option) => (
                <ToggleChip
                  key={option.value}
                  active={booleanFilters.includes(option.value)}
                  onClick={() => toggleBooleanFilter(option.value)}
                  label={option.label}
                />
              ))}
            </div>
          </Field>
        </section>

        <section className="space-y-4 border-t border-border pt-5">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Extra Syntax</h2>

          <Field label="Append Raw Query">
            <TextInput
              value={rawSyntax}
              onChange={setRawSyntax}
              placeholder='e.g. (c:red OR c:green) -is:vanilla'
            />
          </Field>
          <p className="text-xs text-text-muted">
            Use this for grouped logic, explicit negation, or any syntax from the guide that does not deserve a bespoke form control.
          </p>
        </section>

        <div className="border-t border-border pt-4 space-y-3">
          {query && (
            <p className="text-[13px] text-text-muted">
              Query: <code className="text-text-primary bg-bg-tertiary px-1.5 py-0.5 rounded">{query}</code>
            </p>
          )}
          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-accent hover:bg-accent-hover text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Search
          </button>
        </div>
      </form>
    </PageContainer>
  );
}

function formatNameClause(value: string, mode: TextOp): string {
  return mode === "=" ? quoteValue(value) : formatFieldValue(value);
}

function pushTextClause(parts: string[], field: string, value: string, mode: TextOp) {
  const trimmed = value.trim();
  if (!trimmed) return;
  parts.push(`${field}${mode}${formatFieldValue(trimmed, mode === "=")}`);
}

function pushNumericClause(parts: string[], field: string, value: string, op: ComparisonOp) {
  const trimmed = value.trim();
  if (!trimmed) return;
  parts.push(`${field}${op}${trimmed}`);
}

function formatFieldValue(value: string, forceQuote = false): string {
  if (forceQuote || /\s/.test(value)) return quoteValue(value);
  return value;
}

function quoteValue(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-bg-input border border-border rounded-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-bg-input border border-border rounded-md px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ToggleChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded text-sm border transition-colors ${
        active
          ? "border-accent bg-accent/20 text-text-primary"
          : "border-border bg-bg-input text-text-muted hover:border-text-muted"
      }`}
    >
      {label}
    </button>
  );
}

function TextMatchField({
  label,
  value,
  onChange,
  mode,
  onModeChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  mode: TextOp;
  onModeChange: (value: TextOp) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-1">
        <select
          value={mode}
          onChange={(e) => onModeChange(e.target.value as TextOp)}
          className="w-28 shrink-0 bg-bg-input border border-border rounded-l-md px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
        >
          {TEXT_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-bg-input border border-border rounded-r-md px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
        />
      </div>
    </Field>
  );
}

function NumericField({
  label,
  value,
  onChange,
  op,
  onOpChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  op: ComparisonOp;
  onOpChange: (value: ComparisonOp) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-1">
        <select
          value={op}
          onChange={(e) => onOpChange(e.target.value as ComparisonOp)}
          className="w-16 shrink-0 bg-bg-input border border-border rounded-l-md px-1.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
        >
          {COMPARISON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-bg-input border border-border rounded-r-md px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
        />
      </div>
    </Field>
  );
}

function DateField({
  label,
  value,
  onChange,
  op,
  onOpChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  op: ComparisonOp;
  onOpChange: (value: ComparisonOp) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-1">
        <select
          value={op}
          onChange={(e) => onOpChange(e.target.value as ComparisonOp)}
          className="w-16 shrink-0 bg-bg-input border border-border rounded-l-md px-1.5 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
        >
          {COMPARISON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-bg-input border border-border rounded-r-md px-2 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60"
        />
      </div>
    </Field>
  );
}
