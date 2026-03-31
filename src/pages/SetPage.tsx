import { useParams } from "react-router-dom";
import { useSet } from "../api/hooks";
import { CardGrid } from "../components/card/CardGrid";
import { ErrorState } from "../components/layout/ErrorState";
import { PageContainer } from "../components/layout/PageContainer";
import { usePageMeta } from "../hooks/usePageMeta";

export function SetPage() {
  const { set_code } = useParams<{ set_code: string }>();
  const { data, isLoading, error } = useSet(set_code!);

  if (isLoading) return <div className="p-8" aria-live="polite"><span className="sr-only">Loading set</span></div>;
  if (error) return <ErrorState message={(error as Error).message} wide />;
  if (!data) return null;

  const set = data.data;

  usePageMeta({
    title: `${set.name} (${set.code})`,
    description: `${set.name} — ${set.cards.length} cards. Browse all cards in this One Piece TCG set.`,
  });

  const subtitle = [
    set.released_at && `Released ${new Date(set.released_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    `${set.cards.length} cards`,
  ].filter(Boolean).join(" \u00B7 ");

  return (
    <PageContainer title={`${set.name} (${set.code})`} subtitle={subtitle} wide>
      {set.products && set.products.length > 0 && (
        <p className="text-text-muted text-sm -mt-4 mb-6">
          Products: {set.products.map((p) => p.name).join(", ")}
        </p>
      )}
      <CardGrid cards={set.cards} />
    </PageContainer>
  );
}
