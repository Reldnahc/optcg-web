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
    ?? preview?.variants?.[0]?.media.thumbnail_url
    ?? preview?.variants?.[0]?.media.image_url
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
        className={`pointer-events-none absolute z-30 hidden w-[34rem] md:block ${isOpen ? "" : "md:hidden"} ${previewPositionClass}`}
      >
        <span className="block overflow-hidden rounded-xl border border-border bg-bg-secondary shadow-xl shadow-black/45">
          <span className="flex items-stretch gap-4 p-4">
            <span className="w-48 shrink-0 self-start overflow-hidden rounded-lg border border-border bg-bg-card">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt={preview?.name ?? cardNumber} className="block w-full" loading="lazy" />
              ) : (
                <span className="flex aspect-[63/88] items-center justify-center px-2 text-center text-[10px] text-text-muted">
                  {cardNumber}
                </span>
              )}
            </span>

            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-1.5 text-xs">
                {preview?.card_type ? (
                  <span className="font-semibold uppercase tracking-[0.1em] text-text-secondary">
                    {preview.card_type}
                  </span>
                ) : null}
                {preview?.attribute?.length ? (
                  <>
                    <span className="text-text-muted/85">
                      &middot;
                    </span>
                    <span className="font-medium text-text-secondary">
                      {preview.attribute.join("/")}
                    </span>
                  </>
                ) : null}
                {preview?.color.length ? (
                  <span className="text-text-muted/85">
                    &middot;
                  </span>
                ) : null}
                {preview?.color.length ? (
                  <span className="font-medium text-text-secondary">
                    {preview.color.join(" / ")}
                  </span>
                ) : null}
                {preview?.cost != null ? (
                  <>
                    <span className="text-text-muted/85">
                      &middot;
                    </span>
                    <span className="font-medium text-text-secondary">
                      Cost {preview.cost}
                    </span>
                  </>
                ) : null}
              </span>
              <span className="mt-1 block text-lg font-semibold leading-tight text-text-primary">
                {preview?.name ?? "Loading card..."}
              </span>
              {preview ? (
                <>
                  {preview.types.length > 0 ? (
                    <MetaRow label="" value={preview.types.join("/")} />
                  ) : null}
                  {preview.counter != null ? (
                    <MetaRow label="Counter" value={`+${preview.counter}`} />
                  ) : null}
                  {effectText ? (
                    <span className="mt-3 line-clamp-5 block text-sm leading-6 text-text-primary/90">
                      {effectText}
                    </span>
                  ) : null}
                  {triggerText ? (
                    <span className="mt-2 line-clamp-3 block text-sm leading-6 text-text-primary/85">
                        {triggerText}
                    </span>
                  ) : null}
                  {(preview.rarity || preview.block || cardNumber) ? (
                    <span className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-2.5 text-xs uppercase tracking-[0.1em] text-text-secondary">
                      {preview.rarity ? (
                        <span>{preview.rarity}</span>
                      ) : null}
                      {preview.rarity && preview.block ? (
                        <span>&middot;</span>
                      ) : null}
                      {preview.block ? (
                        <span>Block {preview.block}</span>
                      ) : null}
                      {(preview.rarity || preview.block) && cardNumber ? (
                        <span>&middot;</span>
                      ) : null}
                      {cardNumber ? (
                        <span className="font-semibold uppercase tracking-wider">{cardNumber}</span>
                      ) : null}
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

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <span className={`mt-1 grid items-start gap-2 text-sm ${label ? "grid-cols-[4.75rem_minmax(0,1fr)]" : "grid-cols-1"}`}>
      {label ? <span className="text-text-muted">{label}</span> : null}
      <span className="min-w-0 text-text-secondary">{value}</span>
    </span>
  );
}
