import { useCallback, useEffect, useRef, useState } from "react";

const SEGMENTS = [
  { name: "red", fill: "var(--color-op-red)" },
  { name: "green", fill: "var(--color-op-green)" },
  { name: "blue", fill: "var(--color-op-blue)" },
  { name: "purple", fill: "var(--color-op-purple)" },
  { name: "black", fill: "var(--color-op-black)" },
  { name: "yellow", fill: "var(--color-op-yellow)" },
] as const;

const CX = 50;
const CY = 50;
const R_OUTER = 46;
const R_INNER = 14;
const HEX_STROKE = "#14161c";
const OPEN_SIZE_CLASS = "h-24 w-24";
const CLOSED_SIZE_CLASS = "h-14 w-14";
const COLLAPSED_SCALE = 14 / 24;
const CLOSE_DELAY_MS = 90;

function hexVertex(cx: number, cy: number, r: number, i: number): [number, number] {
  const angle = (Math.PI / 180) * (i * 60 - 90);
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

const outerVerts = Array.from({ length: 6 }, (_, i) => hexVertex(CX, CY, R_OUTER, i));
const innerVerts = Array.from({ length: 6 }, (_, i) => hexVertex(CX, CY, R_INNER, i));
const outerHexPoints = outerVerts.map(([x, y]) => `${x},${y}`).join(" ");
const innerHexPoints = innerVerts.map(([x, y]) => `${x},${y}`).join(" ");

const segmentPaths = SEGMENTS.map((segment, i) => {
  const next = (i + 1) % 6;
  const [ix1, iy1] = innerVerts[i];
  const [ox1, oy1] = outerVerts[i];
  const [ox2, oy2] = outerVerts[next];
  const [ix2, iy2] = innerVerts[next];
  return {
    ...segment,
    d: `M${ix1},${iy1} L${ox1},${oy1} L${ox2},${oy2} L${ix2},${iy2}Z`,
  };
});

interface Props {
  selected: string[];
  onChange: (colors: string[]) => void;
}

function useHasHover() {
  const [hasHover, setHasHover] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover)");
    const handler = (event: MediaQueryListEvent) => setHasHover(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return hasHover;
}

export function ColorHexFilter({ selected, onChange }: Props) {
  const hasHover = useHasHover();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeDelayTimeoutRef = useRef<number | null>(null);

  const clearCloseDelayTimeout = useCallback(() => {
    if (closeDelayTimeoutRef.current != null) {
      window.clearTimeout(closeDelayTimeoutRef.current);
      closeDelayTimeoutRef.current = null;
    }
  }, []);

  const openPicker = useCallback(() => {
    clearCloseDelayTimeout();
    setIsClosing(false);
    setIsOpen(true);
  }, [clearCloseDelayTimeout]);

  const closePicker = useCallback(() => {
    clearCloseDelayTimeout();
    setIsOpen(false);
    setIsClosing(true);
  }, [clearCloseDelayTimeout]);

  const scheduleClose = useCallback(() => {
    clearCloseDelayTimeout();
    closeDelayTimeoutRef.current = window.setTimeout(() => {
      closeDelayTimeoutRef.current = null;
      closePicker();
    }, CLOSE_DELAY_MS);
  }, [clearCloseDelayTimeout, closePicker]);

  useEffect(() => () => {
    clearCloseDelayTimeout();
  }, [clearCloseDelayTimeout]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closePicker();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePicker();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePicker, isOpen]);

  const hasSelection = selected.length > 0;
  const isExpandedLayerVisible = isOpen || isClosing;

  const toggleColor = useCallback((name: string) => {
    onChange(
      selected.includes(name)
        ? selected.filter((color) => color !== name)
        : [...selected, name],
    );
  }, [onChange, selected]);

  const segmentFill = (name: string, fill: string) =>
    hasSelection && !selected.includes(name) ? "#111318" : fill;

  const segmentOpacity = (name: string) => {
    if (!hasSelection) {
      return 0.28;
    }

    return selected.includes(name) ? 1 : 0.16;
  };

  const renderHex = (interactive: boolean, strokeOuter: number, gapStroke: number) => (
    <svg viewBox="0 0 100 100" className="block h-full w-full">
      {segmentPaths.map((segment) => (
        <path
          key={segment.name}
          d={segment.d}
          fill={segmentFill(segment.name, segment.fill)}
          fillOpacity={segmentOpacity(segment.name)}
          stroke={HEX_STROKE}
          strokeWidth={gapStroke}
          strokeLinejoin="round"
          className={interactive ? "cursor-pointer" : ""}
          style={{ transition: "fill 150ms, fill-opacity 150ms" }}
          onClick={interactive ? (event) => {
            event.stopPropagation();
            toggleColor(segment.name);
          } : undefined}
        />
      ))}
      <polygon
        points={innerHexPoints}
        fill="#111318"
        className={interactive ? "cursor-pointer" : ""}
        onClick={interactive ? (event) => {
          event.stopPropagation();
          closePicker();
        } : undefined}
      />
      <polygon
        points={outerHexPoints}
        fill="none"
        stroke={HEX_STROKE}
        strokeWidth={strokeOuter}
        strokeLinejoin="round"
      />
    </svg>
  );

  const handleExpandedTransitionEnd = useCallback(() => {
    if (!isOpen && isClosing) {
      setIsClosing(false);
    }
  }, [isClosing, isOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-label="Filter by color"
        onClick={hasHover ? undefined : () => (isOpen ? closePicker() : openPicker())}
        onPointerEnter={hasHover ? openPicker : undefined}
        onPointerLeave={hasHover ? scheduleClose : undefined}
        className={`${CLOSED_SIZE_CLASS} relative z-10 rounded-full transition-opacity duration-150 ${
          isExpandedLayerVisible ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        {renderHex(false, 7, 2.5)}
      </button>

      <div
        className={`absolute left-1/2 top-1/2 z-20 transition-transform duration-250 ease-out ${
          !isOpen && !isClosing ? "pointer-events-none" : ""
        }`}
        style={{ transform: `translate(-50%, -50%) scale(${isOpen ? 1 : COLLAPSED_SCALE})` }}
        onPointerEnter={hasHover ? openPicker : undefined}
        onPointerLeave={hasHover ? scheduleClose : undefined}
        onTransitionEnd={handleExpandedTransitionEnd}
      >
        <button
          type="button"
          tabIndex={isOpen ? 0 : -1}
          onClick={hasHover ? undefined : () => closePicker()}
          className={`${OPEN_SIZE_CLASS} block rounded-full`}
        >
          {renderHex(isOpen, 6, 2)}
        </button>
      </div>
    </div>
  );
}
