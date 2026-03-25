import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import type { Card } from "../api/types";
import { ErrorState } from "../components/layout/ErrorState";

export function RandomRedirect() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiFetch<{ data: Card }>("/random")
      .then((result) => {
        if (cancelled) return;
        navigate(`/cards/${result.data.card_number}`, { replace: true });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : "Unable to fetch a random card.");
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (errorMessage) {
    return <ErrorState message={errorMessage} />;
  }

  return <div className="p-8 text-center" aria-live="polite"><span className="sr-only">Finding a random card</span></div>;
}
