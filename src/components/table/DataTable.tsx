import type { ReactNode } from "react";

type SortOrder = "asc" | "desc";

export function DataTable({
  children,
  minWidthClass,
}: {
  children: ReactNode;
  minWidthClass?: string;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border bg-bg-card/30">
      <table className={`w-full table-fixed text-sm ${minWidthClass ?? ""}`.trim()}>
        {children}
      </table>
    </div>
  );
}

export function SortableTableHeader({
  active,
  align = "left",
  label,
  monospace = false,
  order,
  onClick,
  widthClass,
}: {
  active: boolean;
  align?: "left" | "right";
  label: string;
  monospace?: boolean;
  order: SortOrder;
  onClick: () => void;
  widthClass?: string;
}) {
  const alignmentClass = align === "right" ? "text-right" : "text-left";
  const buttonAlignmentClass = align === "right" ? "justify-end" : "justify-start";

  return (
    <th className={`px-3 py-2 font-medium ${alignmentClass} ${widthClass ?? ""}`.trim()}>
      <button
        className={`flex w-full items-center gap-2 ${buttonAlignmentClass} ${active ? "text-text-primary" : "text-text-muted hover:text-text-primary"} ${monospace ? "font-mono" : ""}`.trim()}
        onClick={onClick}
        type="button"
      >
        <span>{label}</span>
        <span className="inline-block w-4 text-center font-mono text-[11px]">
          {active ? (order === "asc" ? "^" : "v") : ""}
        </span>
      </button>
    </th>
  );
}
