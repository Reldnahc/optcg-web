import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { buildApiUrl } from "../api/client";
import { PageContainer } from "../components/layout/PageContainer";

const REPORT_TYPES = [
  { value: "card_data", label: "Card Data Issue" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "other", label: "Other" },
];

export function ReportIssue() {
  const [params] = useSearchParams();
  const initialCard = params.get("card") || "";
  const [type, setType] = useState(initialCard ? "card_data" : "card_data");
  const [cardNumber, setCardNumber] = useState(initialCard);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = status !== "sending" && message.length >= 10;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch(buildApiUrl("/report"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message,
          ...(cardNumber && { card_number: cardNumber }),
          ...(contact && { contact }),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message || `Error ${res.status}`);
      }

      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg((err as Error).message || "Something went wrong");
    }
  }

  if (status === "sent") {
    return (
      <PageContainer title="Thanks!">
        <div className="text-center">
        <p className="text-text-secondary mb-6">Your report has been sent. We'll look into it.</p>
        <button
          onClick={() => {
            setStatus("idle");
            setMessage("");
            setCardNumber("");
            setContact("");
          }}
          className="text-link hover:text-link-hover hover:underline text-sm"
        >
          Submit another report
        </button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Report an Issue" subtitle="Found a bug, incorrect card data, or have a suggestion? Let us know.">

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-bg-input border border-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/60"
          >
            {REPORT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {type === "card_data" && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Card Number <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="e.g. OP01-001"
              className="w-full bg-bg-input border border-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/60"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Describe the issue or suggestion..."
            className="w-full bg-bg-input border border-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/60 resize-y"
          />
          {message.length > 0 && message.length < 10 && (
            <p className="text-xs text-text-muted mt-1">At least 10 characters required</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Contact <span className="text-text-muted font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Email or Discord username if you'd like a response"
            className="w-full bg-bg-input border border-border rounded px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/60"
          />
        </div>

        {status === "error" && (
          <p className="text-sm text-red-400">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="bg-accent hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded px-4 py-2 text-sm transition-colors"
        >
          {status === "sending" ? "Sending..." : "Submit Report"}
        </button>
      </form>
    </PageContainer>
  );
}
