import { Link } from "react-router-dom";

const SPECIAL_TOKEN_REGEX = /(\[[^\]]+\]|\{[^}]+\}|"[^"]+")/g;
const CIRCLED_NUMBER_REGEX = /([①-⑳⓪➀-➉])/g;

export function CardRulesText({
  text,
  compact = false,
}: {
  text: string;
  compact?: boolean;
}) {
  const lines = text.split(/\r?\n/);

  return (
    <div className={`card-rules-text${compact ? " card-rules-text--compact" : ""}`}>
      {lines.map((line, lineIndex) => (
        <div key={`${line}-${lineIndex}`} className="card-rules-line">
          {renderLine(line, compact)}
        </div>
      ))}
    </div>
  );
}

function renderLine(line: string, compact: boolean) {
  const segments = tokenizeLine(line);
  const rendered: React.ReactNode[] = [];
  let shouldBoldLeadAfterBlue = false;
  let finishedBlueLead = false;
  let previousWasTag = false;

  segments.forEach((segment, segmentIndex) => {
    if (segment.type === "tag") {
      const tone = getTagTone(segment.value);
      rendered.push(
        <RulesTag key={`${segment.value}-${segmentIndex}`} value={segment.value} compact={compact} />,
      );

      if (tone === "blue") {
        shouldBoldLeadAfterBlue = hasColonAhead(segments, segmentIndex + 1);
        finishedBlueLead = false;
      }

      previousWasTag = true;
      return;
    }

    if (segment.type === "card_name" || segment.type === "trait_exact" || segment.type === "trait_fuzzy") {
      rendered.push(
        <SearchSyntaxLink key={`${segment.value}-${segmentIndex}`} value={segment.value} kind={segment.type} />,
      );
      previousWasTag = false;
      return;
    }

    if (isTagDividerSegment(segments, segmentIndex)) {
      rendered.push(
        <span key={`${segment.value}-${segmentIndex}`} className="card-rules-copy card-rules-copy--tag-divider">
          /
        </span>,
      );
      previousWasTag = false;
      return;
    }

    const renderMode = shouldBoldLeadAfterBlue && !finishedBlueLead ? "blue-lead" : "default";
    const { nodes, consumedColon } = renderCopySegment(
      bindLeadingPunctuationAfterTag(segment.value, previousWasTag),
      segmentIndex,
      renderMode,
    );
    rendered.push(...nodes);
    previousWasTag = false;

    if (renderMode === "blue-lead" && consumedColon) {
      finishedBlueLead = true;
    }
  });

  return rendered;
}

function isTagDividerSegment(
  segments: Array<{ type: "tag" | "card_name" | "trait_exact" | "trait_fuzzy" | "text"; value: string }>,
  index: number,
) {
  const segment = segments[index];
  const previous = segments[index - 1];
  const next = segments[index + 1];

  return (
    segment?.type === "text"
    && segment.value.trim() === "/"
    && previous?.type === "tag"
    && next?.type === "tag"
  );
}

function hasColonAhead(
  segments: Array<{ type: "tag" | "card_name" | "trait_exact" | "trait_fuzzy" | "text"; value: string }>,
  startIndex: number,
) {
  for (let i = startIndex; i < segments.length; i += 1) {
    const segment = segments[i];
    if (segment.type === "text" && segment.value.includes(":")) {
      return true;
    }
  }

  return false;
}

function RulesTag({ value, compact }: { value: string; compact: boolean }) {
  const tone = getTagTone(value);
  if (!tone) {
    return <SearchSyntaxLink value={value} kind="card_name" />;
  }

  const label = value.replace(/^\[|\]$/g, "");

  return (
    <span
      className={[
        "card-rules-tag",
        compact ? "card-rules-tag--compact" : "",
        `card-rules-tag--${tone}`,
      ].filter(Boolean).join(" ")}
    >
      <span className="card-rules-tag__label">
        {tone === "don" ? <DonTagLabel label={label} /> : label}
      </span>
    </span>
  );
}

function SearchSyntaxLink({
  value,
  kind,
}: {
  value: string;
  kind: "card_name" | "trait_exact" | "trait_fuzzy";
}) {
  const inner = value.slice(1, -1);
  const query = kind === "card_name"
    ? `n="${inner}"`
    : kind === "trait_exact"
      ? `trait="${inner}"`
      : `trait:"${inner}"`;

  return (
    <Link
      to={`/search?q=${encodeURIComponent(query)}`}
      className="card-rules-copy text-link underline-offset-2 hover:text-link-hover hover:underline"
    >
      {value}
    </Link>
  );
}

function DonTagLabel({ label }: { label: string }) {
  const match = label.match(/^(DON!!)\s+(x)(.+)$/i);
  if (!match) {
    return <>{label}</>;
  }

  return (
    <>
      {match[1]}
      <span className="card-rules-tag__don-gap card-rules-tag__don-gap--before" />
      <span className="card-rules-tag__don-x">✕</span>
      <span className="card-rules-tag__don-gap card-rules-tag__don-gap--after" />
      {match[3]}
    </>
  );
}

function tokenizeLine(
  line: string,
): Array<{ type: "tag" | "card_name" | "trait_exact" | "trait_fuzzy" | "text"; value: string }> {
  return line
    .split(SPECIAL_TOKEN_REGEX)
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith("[") && segment.endsWith("]")) {
        return { type: "tag" as const, value: segment };
      }

      if (segment.startsWith("{") && segment.endsWith("}")) {
        return { type: "trait_exact" as const, value: segment };
      }

      if (segment.startsWith("\"") && segment.endsWith("\"")) {
        return { type: "trait_fuzzy" as const, value: segment };
      }

      return { type: "text" as const, value: segment };
    });
}

function renderCopySegment(
  value: string,
  segmentIndex: number,
  mode: "default" | "blue-lead",
): { nodes: React.ReactNode[]; consumedColon: boolean } {
  const nodes: React.ReactNode[] = [];
  const parts = value.split(/(\([^)]*\))/g).filter((part) => part.length > 0);
  let consumedColon = false;
  let inBlueLead = mode === "blue-lead";

  parts.forEach((part, partIndex) => {
    const key = `${segmentIndex}-${partIndex}`;

    if (part.startsWith("(") && part.endsWith(")")) {
      nodes.push(
        <span key={key} className="card-rules-copy card-rules-copy--italic">
          {part}
        </span>,
      );
      return;
    }

    if (!inBlueLead) {
      nodes.push(
        <span key={key} className="card-rules-copy">
          {part}
        </span>,
      );
      return;
    }

    const colonIndex = part.indexOf(":");
    if (colonIndex === -1) {
      nodes.push(
        <span key={key} className="card-rules-copy card-rules-copy--lead">
          {part}
        </span>,
      );
      return;
    }

    const boldPart = part.slice(0, colonIndex);
    const remainder = part.slice(colonIndex);

    if (boldPart) {
      nodes.push(...renderLeadTextNodes(boldPart, `${key}-lead`));
    }

    if (remainder) {
      nodes.push(
        <span key={`${key}-rest`} className="card-rules-copy">
          {remainder}
        </span>,
      );
    }

    consumedColon = true;
    inBlueLead = false;
  });

  return { nodes, consumedColon };
}

function renderLeadTextNodes(value: string, keyPrefix: string): React.ReactNode[] {
  return value
    .split(CIRCLED_NUMBER_REGEX)
    .filter((part) => part.length > 0)
    .map((part, partIndex) => (
      <span
        key={`${keyPrefix}-${partIndex}`}
        className={`card-rules-copy${isCircledNumber(part) ? "" : " card-rules-copy--lead"}`}
      >
        {part}
      </span>
    ));
}

function isCircledNumber(value: string) {
  return /^[①-⑳⓪➀-➉]$/.test(value);
}

function bindLeadingPunctuationAfterTag(value: string, previousWasTag: boolean) {
  if (!previousWasTag) return value;
  return value.replace(/^([.,!?;]+)/, "\u2060$1");
}

function getTagTone(value: string): "don" | "blue" | "once" | "trigger" | "ability" | "counter" | null {
  const normalized = value.toLowerCase().replace(/[’]/g, "'");

  if (normalized.startsWith("[don!!")) {
    return "don";
  }

  if (normalized === "[once per turn]") {
    return "once";
  }

  if (normalized === "[trigger]") {
    return "trigger";
  }

  if (
    normalized === "[blocker]"
    || normalized === "[rush]"
    || normalized === "[rush: character]"
    || normalized === "[double attack]"
    || normalized === "[banish]"
    || normalized === "[unblockable]"
  ) {
    return "ability";
  }

  if (normalized === "[counter]") {
    return "counter";
  }

  if (
    normalized === "[when attacking]"
    || normalized === "[on your opponent's attack]"
    || normalized === "[on block]"
    || normalized === "[activate: main]"
    || normalized === "[main]"
    || normalized === "[on play]"
    || normalized === "[on k.o.]"
    || normalized === "[your turn]"
    || normalized === "[end of your turn]"
    || normalized === "[opponent's turn]"
    || normalized === "[opponents turn]"
  ) {
    return "blue";
  }

  return null;
}
