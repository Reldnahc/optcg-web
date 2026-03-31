import { useEffect, useRef, useState } from "react";
import { CardRulesText } from "./CardRulesText";

export function TriggerBlock({ className, text, compact = false }: { className?: string; text: string; compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [wraps, setWraps] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const firstLine = el.querySelector(".card-rules-line") as HTMLElement | null;
    if (!firstLine) return;

    const check = () => {
      const lineHeight = parseFloat(getComputedStyle(firstLine).lineHeight) || firstLine.offsetHeight;
      setWraps(firstLine.offsetHeight > lineHeight * 1.5);
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(firstLine);
    return () => observer.disconnect();
  }, [text]);

  return (
    <div
      ref={ref}
      className={`trigger-block rounded bg-black/90 overflow-hidden ${wraps ? "trigger-block--wraps" : "trigger-block--no-wrap"} ${className ?? ""}`}
    >
      <CardRulesText text={text} compact={compact} />
    </div>
  );
}
