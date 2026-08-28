import { clampSr, elimSrBreakdown, rankFromSr, WZ_PLACEMENTS } from "@/lib/ranked";
import { normalizeTeammates, teammateKey } from "./sessions";
import type { HistoryDocument, HistoryMatch, HistoryTeammate, NewMatch } from "./types";

export function teammateSlugDiff(
  previous: HistoryTeammate[],
  next: HistoryTeammate[],
): { added: string[]; removed: string[] } {
  const prev = new Set(sluggedSlugs(previous));
  const nxt = new Set(sluggedSlugs(next));
  return {
    added: [...nxt].filter((slug) => !prev.has(slug)),
    removed: [...prev].filter((slug) => !nxt.has(slug)),
  };
}

export function teammatesForAcceptedMatch(args: {
  inviter: HistoryTeammate;
  sourceTeammates: HistoryTeammate[];
  inviteeSlug: string | null;
}): HistoryTeammate[] {
  const skip = new Set<string>([teammateKey(args.inviter)]);
  if (args.inviteeSlug) skip.add(`slug:${args.inviteeSlug.toLowerCase()}`);
  const rest = args.sourceTeammates.filter((teammate) => !skip.has(teammateKey(teammate)));
  return normalizeTeammates([args.inviter, ...rest]);
}

export function currentSrFromHistory(doc: HistoryDocument, fallback: number): number {
  const latest = [...doc.matches].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1);
  return latest?.srAfter ?? fallback;
}

export function draftFromSourceMatch(
  source: HistoryMatch,
  srBefore: number,
  teammates: HistoryTeammate[],
): NewMatch | null {
  const sr = clampSr(srBefore);
  if (source.mode === "wz") {
    const placement = WZ_PLACEMENTS.find((item) => item.id === source.placement);
    if (!placement) return null;
    const elim = elimSrBreakdown(source.squadElims, source.yourElims);
    const fee = rankFromSr(sr).fee;
    const srAfter = clampSr(sr + placement.placementSr + elim.elimSr - fee);
    return {
      mode: "wz",
      srBefore: sr,
      srAfter,
      net: srAfter - sr,
      placement: source.placement,
      squadElims: source.squadElims,
      yourElims: source.yourElims,
      fee,
      placementSr: placement.placementSr,
      elimSr: elim.elimSr,
      capped: elim.capped,
      teammates,
    };
  }

  const srAfter = clampSr(sr + Math.max(0, Math.floor(source.srPerWin)));
  return {
    mode: "mp",
    srBefore: sr,
    srAfter,
    net: srAfter - sr,
    srPerWin: source.srPerWin,
    teammates,
  };
}

export function inviteMatchSummary(match: HistoryMatch): string {
  if (match.mode === "wz") {
    const placement = WZ_PLACEMENTS.find((item) => item.id === match.placement);
    const label = placement?.label ?? match.placement;
    return `${label} · ${match.squadElims} squad elims`;
  }
  return `+${match.srPerWin} SR`;
}

function sluggedSlugs(teammates: HistoryTeammate[]): string[] {
  const slugs: string[] = [];
  const seen = new Set<string>();
  for (const teammate of teammates) {
    const slug = teammate.slug?.trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
  }
  return slugs;
}
