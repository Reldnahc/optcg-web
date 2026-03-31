import { useParams } from "react-router-dom";
import { useFormat } from "../api/hooks";
import type { FormatDetail } from "../api/types";
import { CardHoverPreviewLink } from "../components/card/CardHoverPreviewLink";
import { ErrorState } from "../components/layout/ErrorState";
import { PageContainer } from "../components/layout/PageContainer";
import { usePageMeta } from "../hooks/usePageMeta";

type DisplayBan = Omit<FormatDetail["bans"][number], "paired_with"> & {
  paired_with: string[];
};

export function FormatPage() {
  const { name } = useParams<{ name: string }>();
  const { data, isLoading, error } = useFormat(name!);
  const format = data?.data;

  usePageMeta({
    title: format?.name,
    description: format?.description || (format ? `${format.name} - One Piece TCG format legality, banlists, and legal sets.` : undefined),
  });

  if (isLoading) return <div className="p-8" aria-live="polite"><span className="sr-only">Loading format</span></div>;
  if (error) return <ErrorState message={(error as Error).message} />;
  if (!format) return null;

  const legalBlocks = format.blocks.filter((b) => b.legal);
  const rotatedBlocks = format.blocks.filter((b) => !b.legal);
  const displayBans = mergeFormatBans(format.bans);

  return (
    <PageContainer title={format.name} subtitle={format.description || undefined}>
      <section className="mb-6">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">
          Legal Blocks ({legalBlocks.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {legalBlocks.map((block) => (
            <span key={block.block} className="rounded px-2.5 py-1 text-sm text-legal bg-legal/10 border border-legal/20">
              Block {block.block}
            </span>
          ))}
        </div>
      </section>

      {rotatedBlocks.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            Rotated Blocks ({rotatedBlocks.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {rotatedBlocks.map((block) => (
              <span key={block.block} className="rounded px-2.5 py-1 text-sm text-text-muted bg-bg-card border border-border">
                Block {block.block}
                {block.rotated_at && (
                  <span className="ml-1 text-xs">
                    ({new Date(block.rotated_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })})
                  </span>
                )}
              </span>
            ))}
          </div>
        </section>
      )}

      {format.bans.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">
            Banned and Restricted Cards ({displayBans.length})
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[12px] text-text-muted">
                <th className="pb-1.5 font-medium">Card</th>
                <th className="pb-1.5 font-medium">Status</th>
                <th className="pb-1.5 font-medium">Date</th>
                <th className="pb-1.5 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {displayBans.map((ban) => {
                const isFuture = new Date(ban.banned_at) > new Date();
                return (
                  <tr key={`${ban.card_number}-${ban.type}-${ban.banned_at}`} className="border-b border-border/50">
                    <td className="py-2">
                      <CardHoverPreviewLink
                        cardNumber={ban.card_number}
                        className={`font-mono hover:text-link ${isFuture ? "text-text-secondary" : ""}`}
                        previewPosition="top"
                      >
                        {ban.card_number}
                      </CardHoverPreviewLink>
                    </td>
                    <td className="py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                          isFuture
                            ? "border-accent/30 bg-accent/10 text-accent"
                            : ban.type === "banned"
                              ? "border-banned/30 bg-banned/10 text-banned"
                              : ban.type === "restricted"
                                ? "border-restricted/30 bg-restricted/10 text-restricted"
                                : "border-pair/30 bg-pair/10 text-pair"
                        }`}
                      >
                        {isFuture
                          ? "Upcoming"
                          : ban.type === "pair"
                            ? "Pair Ban"
                            : ban.type === "restricted"
                              ? `Restricted (${ban.max_copies ?? 1})`
                              : "Banned"}
                      </span>
                    </td>
                    <td className={`py-2 ${isFuture ? "text-text-secondary" : "text-text-muted"}`}>
                      {formatUTCDate(ban.banned_at)}
                    </td>
                    <td className={`py-2 ${isFuture ? "text-text-secondary" : "text-text-muted"}`}>
                      {ban.type === "pair" && ban.paired_with.length > 0 ? (
                        <>
                          with{" "}
                          {renderPairedCards(ban.paired_with, isFuture)}
                        </>
                      ) : ban.reason || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </PageContainer>
  );
}

function mergeFormatBans(bans: FormatDetail["bans"]): DisplayBan[] {
  const merged = new Map<string, DisplayBan>();
  const displayBans: DisplayBan[] = [];

  for (const ban of bans) {
    if (ban.type !== "pair") {
      displayBans.push({
        ...ban,
        paired_with: ban.paired_with ? [ban.paired_with] : [],
      });
      continue;
    }

    const key = [ban.card_number, ban.type, ban.banned_at, ban.reason ?? "", ban.max_copies ?? ""].join("::");
    const existing = merged.get(key);

    if (!existing) {
      const nextBan: DisplayBan = {
        ...ban,
        paired_with: ban.paired_with ? [ban.paired_with] : [],
      };

      merged.set(key, nextBan);
      displayBans.push(nextBan);
      continue;
    }

    if (ban.paired_with && !existing.paired_with.includes(ban.paired_with)) {
      existing.paired_with.push(ban.paired_with);
    }
  }

  return displayBans;
}

function formatUTCDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function renderPairedCards(cardNumbers: string[], muted = false) {
  return cardNumbers.map((cardNumber, index) => (
    <span key={cardNumber}>
      {index > 0 && (index === cardNumbers.length - 1 ? " or " : ", ")}
      <CardHoverPreviewLink
        cardNumber={cardNumber}
        className={`font-mono text-link hover:text-link-hover ${muted ? "text-link/80" : ""}`}
        previewPosition="top"
      >
        {cardNumber}
      </CardHoverPreviewLink>
    </span>
  ));
}
