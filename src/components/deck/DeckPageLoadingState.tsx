import { DEFAULT_PAGE_CONTAINER_CLASS } from "../layout/container";

export function DeckPageLoadingState({
  title = "Loading deck",
  description = "Preparing saved decks, previews, and deck data.",
  compact = false,
}: {
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div className={`${DEFAULT_PAGE_CONTAINER_CLASS} ${compact ? "py-4" : "py-6"}`} aria-live="polite">
      <div className="rounded-2xl border border-border/70 bg-bg-card/72 p-4 sm:p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 shrink-0">
                <span className="absolute left-0 top-1 h-7 w-5 rounded-md border border-border/70 bg-bg-input/70 animate-[deck-card-rise_1.15s_ease-in-out_infinite]" />
                <span className="absolute left-2 top-0 h-7 w-5 rounded-md border border-accent/40 bg-accent/12 animate-[deck-card-rise_1.15s_ease-in-out_0.12s_infinite]" />
                <span className="absolute left-4 top-1 h-7 w-5 rounded-md border border-border/70 bg-bg-input/70 animate-[deck-card-rise_1.15s_ease-in-out_0.24s_infinite]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{title}</p>
                <p className="text-sm text-text-secondary">{description}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            <span className="h-8 w-20 animate-pulse rounded-lg border border-border/70 bg-bg-input/60" />
            <span className="h-8 w-24 animate-pulse rounded-lg border border-border/70 bg-bg-input/60" />
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-border/60 bg-bg-card/45 p-3 sm:grid-cols-[108px_minmax(0,1fr)_auto]"
            >
              <div className={`overflow-hidden rounded-md border border-border/60 bg-bg-input/55 ${
                index === 0 ? "h-[72px] w-[108px]" : "h-[56px] w-[84px] sm:h-[72px] sm:w-[108px]"
              }`}>
                <div className="h-full w-full animate-pulse bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
              </div>
              <div className="space-y-2 min-w-0">
                <div className={`h-3 animate-pulse rounded bg-bg-input/65 ${index === 1 ? "w-[62%]" : "w-[48%]"}`} />
                <div className={`h-2.5 animate-pulse rounded bg-bg-input/45 ${index === 2 ? "w-[44%]" : "w-[58%]"}`} />
                <div className="h-7 w-32 animate-pulse rounded-md border border-border/60 bg-bg-input/55" />
              </div>
              <div className="hidden items-center gap-2 sm:flex">
                <span className="h-7 w-7 animate-pulse rounded-md border border-border/60 bg-bg-input/55" />
                <span className="h-7 w-20 animate-pulse rounded-md border border-border/60 bg-bg-input/55" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
