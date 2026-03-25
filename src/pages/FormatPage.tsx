import { useParams, Link } from "react-router-dom";
import { useFormat } from "../api/hooks";
import type { FormatDetail } from "../api/types";
import { PageContainer } from "../components/layout/PageContainer";

type DisplayBan = Omit<FormatDetail["bans"][number], "paired_with"> & {
  paired_with: string[];
};

export function FormatPage() {
  const { name } = useParams<{ name: string }>();
  const { data, isLoading, error } = useFormat(name!);

  if (isLoading) return <div className="p-8 text-text-muted">Loading...</div>;
  if (error) return <div className="p-8 text-banned">Error: {(error as Error).message}</div>;
  if (!data) return null;

  const format = data.data;
  const legalBlocks = format.blocks.filter((b) => b.legal);
  const rotatedBlocks = format.blocks.filter((b) => !b.legal);
  const displayBans = mergeFormatBans(format.bans);

  return (
    <PageContainer title={format.name} subtitle={format.description || undefined}>
      {/* Legal blocks */}
      <section className="mb-6">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
          Legal Blocks ({legalBlocks.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          {legalBlocks.map((b) => (
            <span key={b.block} className="text-sm text-legal bg-legal/10 border border-legal/20 rounded px-2.5 py-1">
              Block {b.block}
            </span>
          ))}
        </div>
      </section>

      {rotatedBlocks.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
            Rotated Blocks ({rotatedBlocks.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {rotatedBlocks.map((b) => (
              <span key={b.block} className="text-sm text-text-muted bg-bg-card border border-border rounded px-2.5 py-1">
                Block {b.block}
                {b.rotated_at && (
                  <span className="text-xs ml-1">
                    ({new Date(b.rotated_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })})
                  </span>
                )}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Banlist */}
      {format.bans.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
            Banned & Restricted Cards ({displayBans.length})
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted text-[12px] border-b border-border">
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
                  <tr key={`${ban.card_number}-${ban.type}-${ban.banned_at}`} className={`border-b border-border/50 ${isFuture ? "opacity-60" : ""}`}>
                    <td className="py-2">
                      <Link to={`/cards/${ban.card_number}`} className="font-mono hover:text-link">
                        {ban.card_number}
                      </Link>
                    </td>
                    <td className="py-2">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        isFuture ? "border-accent/30 bg-accent/10 text-accent" :
                        ban.type === "banned" ? "border-banned/30 bg-banned/10 text-banned" :
                        ban.type === "restricted" ? "border-restricted/30 bg-restricted/10 text-restricted" :
                        "border-pair/30 bg-pair/10 text-pair"
                      }`}>
                        {isFuture ? "Upcoming" : ban.type === "pair" ? "Pair Ban" : ban.type === "restricted" ? `Restricted (${ban.max_copies ?? 1})` : "Banned"}
                      </span>
                    </td>
                    <td className="py-2 text-text-muted">
                      {formatUTCDate(ban.banned_at)}
                    </td>
                    <td className="py-2 text-text-muted">
                      {ban.type === "pair" && ban.paired_with.length > 0 ? (
                        <>
                          with{" "}
                          {renderPairedCards(ban.paired_with)}
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
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function renderPairedCards(cardNumbers: string[]) {
  return cardNumbers.map((cardNumber, index) => (
    <span key={cardNumber}>
      {index > 0 && (index === cardNumbers.length - 1 ? " or " : ", ")}
      <Link to={`/cards/${cardNumber}`} className="font-mono text-link hover:text-link-hover">
        {cardNumber}
      </Link>
    </span>
  ));
}
