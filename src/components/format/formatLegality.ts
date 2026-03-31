import type { FormatDetail } from "../../api/types";

export type DisplayBan = Omit<FormatDetail["bans"][number], "paired_with"> & {
  paired_with: string[];
};

export type FormatLegalityBuckets = {
  activeBans: DisplayBan[];
  activeRestrictions: DisplayBan[];
  activePairs: DisplayBan[];
  upcomingBans: DisplayBan[];
  upcomingRestrictions: DisplayBan[];
  upcomingPairs: DisplayBan[];
};

export function getFormatLegalityBuckets(
  bans: FormatDetail["bans"],
  now = new Date(),
): FormatLegalityBuckets {
  const activeBans: DisplayBan[] = [];
  const activeRestrictions: DisplayBan[] = [];
  const upcomingBans: DisplayBan[] = [];
  const upcomingRestrictions: DisplayBan[] = [];

  const activePairMap = new Map<string, DisplayBan>();
  const upcomingPairMap = new Map<string, DisplayBan>();
  const activePairs: DisplayBan[] = [];
  const upcomingPairs: DisplayBan[] = [];

  for (const ban of bans) {
    const isUpcoming = isFutureDate(ban.banned_at, now);

    if (ban.type === "pair") {
      const targetMap = isUpcoming ? upcomingPairMap : activePairMap;
      const targetList = isUpcoming ? upcomingPairs : activePairs;
      const key = [ban.card_number, ban.type, ban.banned_at, ban.reason ?? "", ban.max_copies ?? ""].join("::");
      const existing = targetMap.get(key);

      if (!existing) {
        const next: DisplayBan = {
          ...ban,
          paired_with: ban.paired_with ? [ban.paired_with] : [],
        };
        targetMap.set(key, next);
        targetList.push(next);
      } else if (ban.paired_with && !existing.paired_with.includes(ban.paired_with)) {
        existing.paired_with.push(ban.paired_with);
      }

      continue;
    }

    const next: DisplayBan = {
      ...ban,
      paired_with: ban.paired_with ? [ban.paired_with] : [],
    };

    if (ban.type === "restricted") {
      (isUpcoming ? upcomingRestrictions : activeRestrictions).push(next);
    } else {
      (isUpcoming ? upcomingBans : activeBans).push(next);
    }
  }

  return {
    activeBans: sortDisplayBans(activeBans, "desc"),
    activeRestrictions: sortDisplayBans(activeRestrictions, "desc"),
    activePairs: sortDisplayBans(activePairs, "desc"),
    upcomingBans: sortDisplayBans(upcomingBans, "asc"),
    upcomingRestrictions: sortDisplayBans(upcomingRestrictions, "asc"),
    upcomingPairs: sortDisplayBans(upcomingPairs, "asc"),
  };
}

export function countUpcomingChanges(buckets: FormatLegalityBuckets): number {
  return buckets.upcomingBans.length + buckets.upcomingRestrictions.length + buckets.upcomingPairs.length;
}

export function countCurrentRestrictions(buckets: FormatLegalityBuckets): number {
  return buckets.activeRestrictions.length + buckets.activePairs.length;
}

export function isFutureDate(value: string | null | undefined, now = new Date()): boolean {
  if (!value) return false;
  return new Date(value) > now;
}

function sortDisplayBans(entries: DisplayBan[], direction: "asc" | "desc"): DisplayBan[] {
  return [...entries].sort((a, b) => {
    const delta = new Date(a.banned_at).getTime() - new Date(b.banned_at).getTime();
    if (delta !== 0) {
      return direction === "asc" ? delta : -delta;
    }
    return a.card_number.localeCompare(b.card_number);
  });
}
