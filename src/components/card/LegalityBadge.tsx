export const LEGALITY_BADGE_STYLE: Record<string, string> = {
  legal: "border-legal/30 bg-legal/10 text-legal",
  banned: "border-banned/30 bg-banned/10 text-banned",
  restricted: "border-restricted/30 bg-restricted/10 text-restricted",
  pair: "border-pair/30 bg-pair/10 text-pair",
  not_legal: "border-not-legal/30 bg-not-legal/10 text-text-secondary",
  unreleased: "border-accent/30 bg-accent/10 text-accent",
};

export const LEGALITY_LABEL: Record<string, string> = {
  legal: "Legal",
  banned: "Banned",
  restricted: "Restricted",
  pair: "Pair Ban",
  not_legal: "Not Legal",
  unreleased: "Unreleased",
};

export function LegalityBadge({
  format,
  label,
  status,
  size = "sm",
}: {
  format?: string;
  label?: string;
  status: string;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm"
    ? "px-1.5 py-0.5 text-[9px]"
    : "px-2 py-1 text-xs";

  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border font-medium leading-tight ${sizeClass} ${LEGALITY_BADGE_STYLE[status] ?? "border-border text-text-muted"}`}>
      {format ? <span className="text-text-secondary">{format}</span> : null}
      <span>{label ?? LEGALITY_LABEL[status] ?? status}</span>
    </span>
  );
}
