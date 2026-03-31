import { useState, useRef, useEffect, useCallback } from "react";

// Color order: segment 0 = top-right face, going clockwise
// Matches the OPTCG hex logo arrangement
const SEGMENTS = [
  { name: "red", fill: "var(--color-op-red)" },
  { name: "green", fill: "var(--color-op-green)" },
  { name: "blue", fill: "var(--color-op-blue)" },
  { name: "purple", fill: "var(--color-op-purple)" },
  { name: "black", fill: "var(--color-op-black)" },
  { name: "yellow", fill: "var(--color-op-yellow)" },
];

const CX = 50;
const CY = 50;
const R_OUTER = 46;
const R_INNER = 14;

function hexVertex(cx: number, cy: number, r: number, i: number): [number, number] {
  const angle = (Math.PI / 180) * (i * 60 - 90);
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

const outerVerts = Array.from({ length: 6 }, (_, i) => hexVertex(CX, CY, R_OUTER, i));
const innerVerts = Array.from({ length: 6 }, (_, i) => hexVertex(CX, CY, R_INNER, i));

// Each segment is a trapezoid: inner[i] → outer[i] → outer[i+1] → inner[i+1]
const segmentPaths = SEGMENTS.map((seg, i) => {
  const next = (i + 1) % 6;
  const [ix1, iy1] = innerVerts[i];
  const [ox1, oy1] = outerVerts[i];
  const [ox2, oy2] = outerVerts[next];
  const [ix2, iy2] = innerVerts[next];
  return {
    ...seg,
    d: `M${ix1},${iy1} L${ox1},${oy1} L${ox2},${oy2} L${ix2},${iy2}Z`,
  };
});

const outerHexPoints = outerVerts.map(([x, y]) => `${x},${y}`).join(" ");
const innerHexPoints = innerVerts.map(([x, y]) => `${x},${y}`).join(" ");

// Detect coarse pointer (touch device) vs fine pointer (mouse)
function useHasHover() {
  const [hasHover, setHasHover] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    const handler = (e: MediaQueryListEvent) => setHasHover(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return hasHover;
}

interface Props {
  selected: string[];
  onChange: (colors: string[]) => void;
}

export function ColorHexFilter({ selected, onChange }: Props) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasHover = useHasHover();

  const expanded = visible || closing;

  const open = useCallback(() => {
    setClosing(false);
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    if (!visible) return;
    setClosing(true);
    setVisible(false);
  }, [visible]);

  const handleAnimationEnd = useCallback(() => {
    if (closing) setClosing(false);
  }, [closing]);

  // Close on outside tap (touch devices)
  useEffect(() => {
    if (!visible || hasHover) return;
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [visible, hasHover, close]);

  const hasSelection = selected.length > 0;

  const toggle = (name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((c) => c !== name)
        : [...selected, name],
    );
  };

  const segmentFill = (name: string, fill: string) =>
    hasSelection && !selected.includes(name) ? "#111318" : fill;

  const renderHex = (size: string, strokeOuter: number, gapStroke: number, interactive: boolean) => (
    <svg viewBox="0 0 100 100" className={`${size} block`}>
      {segmentPaths.map((p) => (
        <path
          key={p.name}
          d={p.d}
          fill={segmentFill(p.name, p.fill)}
          stroke="#242731"
          strokeWidth={gapStroke}
          strokeLinejoin="round"
          className={interactive ? "cursor-pointer" : ""}
          style={{ transition: "fill 150ms" }}
          onClick={interactive ? () => toggle(p.name) : undefined}
        />
      ))}
      {/* Center black hexagon */}
      <polygon
        points={innerHexPoints}
        fill="#111318"
        className={interactive ? "cursor-pointer" : ""}
        onClick={interactive ? () => close() : undefined}
      />
      {/* Thick outer outline */}
      <polygon
        points={outerHexPoints}
        fill="none"
        stroke="#242731"
        strokeWidth={strokeOuter}
        strokeLinejoin="round"
      />
    </svg>
  );

  // PC: hover to open/close. Mobile: tap to toggle.
  const containerProps = hasHover
    ? { onMouseEnter: open, onMouseLeave: close }
    : {};

  return (
    <div ref={containerRef} className="relative inline-flex items-center" {...containerProps}>
      <button
        type="button"
        onClick={hasHover ? undefined : () => (visible ? close() : open())}
        className="w-14 h-14 shrink-0"
        title="Filter by color"
      >
        {renderHex("w-full h-full", 7, 2.5, false)}
      </button>

      {expanded && (
        <div
          className={`absolute z-50 ${closing ? "hex-filter-collapse" : "hex-filter-expand"}`}
          onAnimationEnd={handleAnimationEnd}
        >
          {renderHex("w-24 h-24 drop-shadow-lg", 6, 2, !closing)}
        </div>
      )}
    </div>
  );
}
