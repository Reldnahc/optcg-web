import { useDonCards } from "../api/hooks";
import { PageContainer } from "../components/layout/PageContainer";
import { usePageMeta } from "../hooks/usePageMeta";

export function DonBrowser() {
  const { data, isLoading } = useDonCards();

  usePageMeta({
    title: "DON!! Cards",
    description: "Browse all DON!! cards in the One Piece Card Game.",
    url: "/don",
  });

  if (isLoading) return <div className="p-8" aria-live="polite"><span className="sr-only">Loading DON cards</span></div>;

  const cards = data?.data ?? [];

  return (
    <PageContainer title="DON!! Cards">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {cards.map((don) => (
          <div
            key={don.id}
            className="bg-bg-card border border-border rounded-lg overflow-hidden hover:bg-bg-hover transition-colors"
          >
            {don.image_url ? (
              <img src={don.image_url} alt={`DON!! ${don.character}`} className="w-full" loading="lazy" />
            ) : (
              <div className="aspect-[5/7] bg-bg-tertiary flex items-center justify-center text-text-muted text-xs">
                DON!!
              </div>
            )}
            <div className="p-3">
              <p className="text-sm font-medium">{don.character}</p>
              <p className="text-xs text-text-secondary">{don.finish} &middot; {don.product_name}</p>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
