import { DEFAULT_PAGE_CONTAINER_CLASS } from "./container";

function isRateLimitMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("rate limit")
    || normalized.includes("too many requests")
    || normalized.includes("429");
}

export function ErrorState({ message }: { message: string }) {
  const isRateLimit = isRateLimitMessage(message);

  return (
    <div className={`${DEFAULT_PAGE_CONTAINER_CLASS} py-8`}>
      <div className="min-h-[45vh] flex items-center justify-center">
        <div
          className={`w-full max-w-xl rounded-xl border px-6 py-5 text-center shadow-lg shadow-black/20 ${
            isRateLimit
              ? "border-accent/40 bg-accent/10"
              : "border-banned/30 bg-banned/10"
          }`}
          role="alert"
          aria-live="polite"
        >
          <h2 className={`text-lg font-semibold ${isRateLimit ? "text-accent" : "text-banned"}`}>
            {isRateLimit ? "Slow down, pirate" : "Something went wrong"}
          </h2>
          <p className="mt-2 text-sm text-text-primary">
            {isRateLimit
              ? "The Den Den Mushi is overheating from too many calls. Give it a moment, catch your breath, and try again."
              : message}
          </p>
          {isRateLimit && (
            <p className="mt-2 text-xs text-text-secondary">
              Too many requests hit the line at once. Wait a few seconds before sending another one.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
