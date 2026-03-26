import { useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "../../api/client";
import type { CardDetail } from "../../api/types";

type CardHoverPreviewLinkProps = {
  cardNumber: string;
  className?: string;
  children?: React.ReactNode;
  previewPosition?: "top" | "bottom";
};

type PreviewPlacement = {
  vertical: "top" | "bottom";
  horizontal: "left" | "center" | "right";
};

export function CardHoverPreviewLink({
  cardNumber,
  className = "",
  children,
  previewPosition = "bottom",
}: CardHoverPreviewLinkProps) {
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const previewRef = useRef<HTMLSpanElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<PreviewPlacement>({
    vertical: previewPosition,
    horizontal: "center",
  });
  const { data } = useQuery({
    queryKey: ["card-preview", cardNumber],
    queryFn: () => apiFetch<{ data: CardDetail }>(`/cards/${cardNumber}`),
    enabled: shouldLoad,
    staleTime: 5 * 60 * 1000,
  });

  const preview = data?.data;
  const thumbnailUrl = preview?.thumbnail_url
    ?? preview?.image_url
    ?? preview?.images[0]?.thumbnail_url
    ?? preview?.images[0]?.image_url
    ?? null;
  const effectText = preview?.effect ?? null;
  const triggerText = preview?.trigger ?? null;
  const label = children ?? cardNumber;
  const previewPositionClass = [
    placement.vertical === "top" ? "bottom-full pb-3" : "top-full pt-3",
    placement.horizontal === "center"
      ? "left-1/2 -translate-x-1/2"
      : placement.horizontal === "left"
        ? "left-0"
        : "right-0",
  ].join(" ");

  const handlePreviewIntent = () => {
    if (!shouldLoad) setShouldLoad(true);
    setIsOpen(true);
  };

  useLayoutEffect(() => {
    if (!isOpen || !wrapperRef.current || !previewRef.current) {
      return;
    }

    const GAP = 12;
    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const previewRect = previewRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - wrapperRect.bottom;
    const spaceAbove = wrapperRect.top;
    const nextVertical =
      spaceBelow < previewRect.height + GAP && spaceAbove > spaceBelow
        ? "top"
        : "bottom";

    const centeredLeft = wrapperRect.left + (wrapperRect.width / 2) - (previewRect.width / 2);
    const centeredRight = centeredLeft + previewRect.width;

    let nextHorizontal: PreviewPlacement["horizontal"] = "center";
    if (centeredLeft < GAP) {
      nextHorizontal = "left";
    } else if (centeredRight > viewportWidth - GAP) {
      nextHorizontal = "right";
    }

    setPlacement((current) => {
      if (current.vertical === nextVertical && current.horizontal === nextHorizontal) {
        return current;
      }

      return {
        vertical: nextVertical,
        horizontal: nextHorizontal,
      };
    });
  }, [isOpen, previewPosition, preview?.card_number]);

  return (
    <span
      ref={wrapperRef}
      className="group relative inline-flex"
      onMouseEnter={handlePreviewIntent}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={handlePreviewIntent}
      onBlur={() => setIsOpen(false)}
    >
      <Link to={`/cards/${cardNumber}`} className={className}>
        {label}
      </Link>

      <span
        ref={previewRef}
        className={`pointer-events-none absolute z-30 hidden w-[32rem] md:block ${isOpen ? "" : "md:hidden"} ${previewPositionClass}`}
      >
        <span className="block overflow-hidden rounded-xl border border-border bg-bg-secondary shadow-xl shadow-black/45">
          <span className="flex items-start gap-4 p-4">
            <span className="w-48 shrink-0 self-start overflow-hidden rounded-lg border border-border bg-bg-card">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt={preview?.name ?? cardNumber} className="block w-full" loading="lazy" />
              ) : (
                <span className="flex aspect-[63/88] items-center justify-center px-2 text-center text-[10px] text-text-muted">
                  {cardNumber}
                </span>
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
                {cardNumber}
              </span>
              <span className="mt-1 block text-base font-semibold leading-tight text-text-primary">
                {preview?.name ?? "Loading card..."}
              </span>
              {preview ? (
                <>
                  <span className="mt-3 flex flex-wrap gap-2 text-sm">
                    {preview.card_type ? <MetaPill label="Type" value={preview.card_type} /> : null}
                    {preview.color.length > 0 ? <MetaPill label="Color" value={preview.color.join(" / ")} /> : null}
                    {preview.cost != null ? <MetaPill label="Cost" value={String(preview.cost)} /> : null}
                    {preview.counter != null ? <MetaPill label="Counter" value={`+${preview.counter}`} /> : null}
                  </span>
                  {effectText ? (
                    <span className="mt-3 line-clamp-5 block text-[12px] leading-snug text-text-secondary">
                      {effectText}
                    </span>
                  ) : null}
                  {triggerText ? (
                    <span className="mt-2 line-clamp-3 block text-[12px] leading-snug text-text-secondary">
                        {triggerText}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="mt-3 block text-sm text-text-muted">
                  Loading preview...
                </span>
              )}
            </span>
          </span>
        </span>
      </span>
    </span>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-md border border-border bg-bg-card/70 px-2.5 py-1.5">
      <span className="block text-[11px] uppercase tracking-wider text-text-muted">{label}</span>
      <span className="mt-0.5 block font-medium text-text-primary">{value}</span>
    </span>
  );
}
