import { Link } from "react-router-dom";
import { useFormats } from "../api/hooks";
import { PageContainer } from "../components/layout/PageContainer";
import { usePageMeta } from "../hooks/usePageMeta";

export function FormatBrowser() {
  const { data, isLoading } = useFormats();

  usePageMeta({
    title: "Formats",
    description: "One Piece Card Game formats — legality, banlists, and restricted cards for each competitive format.",
    url: "/formats",
  });

  if (isLoading) return <div className="p-8" aria-live="polite"><span className="sr-only">Loading formats</span></div>;

  return (
    <PageContainer title="Formats">
      <div className="space-y-3">
        {(data?.data ?? []).map((f) => (
          <Link
            key={f.name}
            to={`/formats/${encodeURIComponent(f.name)}`}
            className="block border border-border rounded p-4 hover:bg-bg-hover/50 hover:no-underline transition-colors"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-text-primary">{f.name}</h2>
              <div className="flex gap-3 text-[12px] text-text-muted">
                <span>{f.legal_blocks} blocks</span>
                {f.ban_count > 0 && <span className="text-banned">{f.ban_count} banned</span>}
              </div>
            </div>
            {f.description && <p className="text-sm text-text-secondary mt-1">{f.description}</p>}
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
