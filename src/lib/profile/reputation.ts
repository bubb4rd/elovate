import type { ReputationVotes } from "./types";

export type StandingId = "unrated" | "contested" | "poor" | "solid" | "trusted";

export type ReputationScore = {
  ups: number;
  downs: number;
  total: number;
  raw: number;
  adjusted: number;
  standing: StandingId;
  standingLabel: string;
  unrated: boolean;
  positivePct: number | null;
};

const STANDING_LABEL: Record<StandingId, string> = {
  unrated: "Unrated",
  contested: "Contested",
  poor: "Poor",
  solid: "Solid",
  trusted: "Trusted",
};

export function scoreReputation(votes: ReputationVotes): ReputationScore {
  const ups = Math.max(0, Math.floor(votes.ups));
  const downs = Math.max(0, Math.floor(votes.downs));
  const total = ups + downs;
  const raw = ups - downs;
  const adjusted = (ups + 2) / (total + 4);
  const unrated = total === 0;
  const standing = unrated ? "unrated" : standingFrom(raw, total, adjusted);

  return {
    ups,
    downs,
    total,
    raw,
    adjusted,
    standing,
    standingLabel: STANDING_LABEL[standing],
    unrated,
    positivePct: total === 0 ? null : Math.round((ups / total) * 100),
  };
}

function standingFrom(raw: number, total: number, adjusted: number): StandingId {
  if (raw <= -5 || adjusted < 0.38) return "poor";
  if (Math.abs(raw) <= 2 && total >= 8) return "contested";
  if (adjusted >= 0.7 && raw >= 8) return "trusted";
  if (raw > 0) return "solid";
  return "contested";
}
