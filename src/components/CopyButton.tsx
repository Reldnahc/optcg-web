import { useEffect, useRef, useState } from "react";

type CopyState = "idle" | "copied" | "error";

export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  className = "",
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    const success = await copyText(value);
    setState(success ? "copied" : "error");

    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = window.setTimeout(() => {
      setState("idle");
      resetTimeoutRef.current = null;
    }, 1400);
  }

  const toneClass =
    state === "copied"
      ? "border-border bg-bg-tertiary/35 text-text-primary"
      : state === "error"
        ? "border-border bg-bg-tertiary/20 text-text-secondary"
        : "border-border bg-bg-tertiary/15 text-text-muted hover:bg-bg-tertiary/25 hover:text-text-primary";

  const accessibleLabel =
    state === "copied"
      ? `${copiedLabel}: ${value}`
      : state === "error"
        ? `Copy failed: ${value}`
        : `${label}: ${value}`;

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={accessibleLabel}
      title={state === "idle" ? label : state === "copied" ? copiedLabel : "Copy failed"}
      className={[
        "inline-flex h-5 w-5 items-center justify-center rounded border transition-colors",
        toneClass,
        className,
      ].filter(Boolean).join(" ")}
    >
      {state === "copied" ? (
        <svg viewBox="0 0 16 16" className="h-3 w-3 fill-current" aria-hidden="true">
          <path d="M6.6 11.4 3.5 8.3l1-1 2.1 2.1 5-5 1 1-6 6Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" className="h-3 w-3 fill-current" aria-hidden="true">
          <path d="M5 2.5A1.5 1.5 0 0 1 6.5 1h5A1.5 1.5 0 0 1 13 2.5v7A1.5 1.5 0 0 1 11.5 11h-5A1.5 1.5 0 0 1 5 9.5v-7Zm1.5-.5a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5h-5Z" />
          <path d="M3.5 5A1.5 1.5 0 0 0 2 6.5v6A1.5 1.5 0 0 0 3.5 14h4A1.5 1.5 0 0 0 9 12.5V12H8v.5a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-6a.5.5 0 0 1 .5-.5H4V5h-.5Z" />
        </svg>
      )}
      <span className="sr-only">
        {state === "copied" ? copiedLabel : state === "error" ? "Copy failed" : label}
      </span>
    </button>
  );
}

async function copyText(value: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to legacy copy path
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    return successful;
  } catch {
    return false;
  }
}
