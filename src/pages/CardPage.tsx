import { useParams, useSearchParams } from "react-router-dom";
import { useCard } from "../api/hooks";
import { CardDetailView } from "../components/card/CardDetail";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "EN",
  ja: "JA",
  fr: "FR",
  zh: "ZH",
};

export function CardPage() {
  const { card_number } = useParams<{ card_number: string }>();
  const [params, setParams] = useSearchParams();
  const lang = params.get("lang") || "en";
  const variantParam = params.get("variant");
  const { data, isLoading, error } = useCard(card_number!, lang);

  const switchLang = (code: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (code === "en") next.delete("lang"); else next.set("lang", code);
      return next;
    }, { replace: true });
  };

  const available = data?.data.available_languages ?? [];
  const showSwitcher = available.length > 1;

  return (
    <div>
      {showSwitcher && (
        <div className="max-w-6xl mx-auto px-4 pt-2.5 flex justify-end">
          <div className="flex gap-px bg-bg-card rounded-md p-px border border-border">
            {available.map((code) => (
              <button
                key={code}
                onClick={() => switchLang(code)}
                className={`min-w-9 px-2 py-0.75 text-[11px] font-medium rounded transition-colors
                  ${lang === code
                    ? "bg-accent text-bg-primary"
                    : "text-text-muted hover:text-text-primary"}`}
              >
                {LANGUAGE_LABELS[code] || code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
      {isLoading && <div className="p-8 text-text-muted">Loading...</div>}
      {error && <div className="p-8 text-banned">Error: {(error as Error).message}</div>}
      {data && <CardDetailView card={data.data} initialVariant={variantParam != null ? parseInt(variantParam, 10) : undefined} />}
    </div>
  );
}
