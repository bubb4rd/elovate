import { WZ_PLACEMENTS, type WzPlacementId } from "@/lib/ranked";
import { teammateKey } from "./sessions";
import type {
  HistoryDocument,
  HistoryTeammate,
  SessionSummary,
} from "./types";

export type HistoryOutcome = "up" | "down" | "mixed";
export type HistoryDateRange = "7d" | "30d" | "month";

export type HistoryFilterState = {
  query: string;
  outcome: HistoryOutcome | null;
  date: HistoryDateRange | null;
  placement: WzPlacementId | null;
  teammate: HistoryTeammate | null;
  streak: boolean;
};

export type HistoryFilterChipId =
  | "query"
  | "outcome"
  | "date"
  | "placement"
  | "teammate"
  | "streak";

export type HistoryFilterChip = {
  id: HistoryFilterChipId;
  label: string;
};

export const HISTORY_OUTCOME_OPTIONS = [
  { id: "up", label: "Up" },
  { id: "down", label: "Down" },
  { id: "mixed", label: "Mixed" },
] as const;

export const HISTORY_DATE_OPTIONS = [
  { id: "7d", label: "Last 7 days", chip: "Last 7d" },
  { id: "30d", label: "Last 30 days", chip: "Last 30d" },
  { id: "month", label: "This month", chip: "This month" },
] as const;

export function emptyHistoryFilter(): HistoryFilterState {
  return {
    query: "",
    outcome: null,
    date: null,
    placement: null,
    teammate: null,
    streak: false,
  };
}

export function historyFilterActive(state: HistoryFilterState): boolean {
  return (
    state.query.trim().length > 0 ||
    state.outcome != null ||
    state.date != null ||
    state.placement != null ||
    state.teammate != null ||
    state.streak
  );
}

export function historyDateFrom(range: HistoryDateRange, now: Date): Date {
  if (range === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (range === "7d" ? 6 : 29));
  return start;
}

function sessionHasQuery(summary: SessionSummary, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return summary.matches.some((match) =>
    match.teammates.some((teammate) => {
      if (teammate.displayName.toLowerCase().includes(needle)) return true;
      return teammate.slug != null && teammate.slug.toLowerCase().includes(needle);
    }),
  );
}

function sessionHasOutcome(summary: SessionSummary, outcome: HistoryOutcome): boolean {
  if (outcome === "up") return summary.net > 0;
  if (outcome === "down") return summary.net < 0;
  let up = false;
  let down = false;
  for (const match of summary.matches) {
    if (match.net > 0) up = true;
    else if (match.net < 0) down = true;
    if (up && down) return true;
  }
  return false;
}

function sessionInDateRange(
  summary: SessionSummary,
  range: HistoryDateRange,
  now: Date,
): boolean {
  const started = Date.parse(summary.session.startedAt);
  if (Number.isNaN(started)) return false;
  return started >= historyDateFrom(range, now).getTime();
}

function sessionHasPlacement(summary: SessionSummary, placement: WzPlacementId): boolean {
  return summary.matches.some(
    (match) => match.mode === "wz" && match.placement === placement,
  );
}

function sessionHasTeammate(summary: SessionSummary, teammate: HistoryTeammate): boolean {
  const key = teammateKey(teammate);
  return summary.matches.some((match) =>
    match.teammates.some((item) => teammateKey(item) === key),
  );
}

export function filterSummaries(
  summaries: SessionSummary[],
  state: HistoryFilterState,
  now = new Date(),
): SessionSummary[] {
  const query = state.query.trim();
  return summaries.filter((summary) => {
    if (query && !sessionHasQuery(summary, query)) return false;
    if (state.outcome && !sessionHasOutcome(summary, state.outcome)) return false;
    if (state.date && !sessionInDateRange(summary, state.date, now)) return false;
    if (state.placement && !sessionHasPlacement(summary, state.placement)) return false;
    if (state.teammate && !sessionHasTeammate(summary, state.teammate)) return false;
    if (state.streak && summary.streak < 2) return false;
    return true;
  });
}

export function historyFilterChips(state: HistoryFilterState): HistoryFilterChip[] {
  const chips: HistoryFilterChip[] = [];
  const query = state.query.trim();
  if (query) chips.push({ id: "query", label: query });
  if (state.outcome) {
    const option = HISTORY_OUTCOME_OPTIONS.find((item) => item.id === state.outcome);
    chips.push({ id: "outcome", label: option?.label ?? state.outcome });
  }
  if (state.date) {
    const option = HISTORY_DATE_OPTIONS.find((item) => item.id === state.date);
    chips.push({ id: "date", label: option?.chip ?? state.date });
  }
  if (state.placement) {
    const option = WZ_PLACEMENTS.find((item) => item.id === state.placement);
    chips.push({ id: "placement", label: option?.label ?? state.placement });
  }
  if (state.teammate) {
    chips.push({ id: "teammate", label: state.teammate.displayName });
  }
  if (state.streak) chips.push({ id: "streak", label: "Streak" });
  return chips;
}

export function clearHistoryFilterChip(
  state: HistoryFilterState,
  id: HistoryFilterChipId,
): HistoryFilterState {
  if (id === "query") return { ...state, query: "" };
  if (id === "outcome") return { ...state, outcome: null };
  if (id === "date") return { ...state, date: null };
  if (id === "placement") return { ...state, placement: null };
  if (id === "teammate") return { ...state, teammate: null };
  return { ...state, streak: false };
}

export function uniqueHistoryTeammates(doc: HistoryDocument): HistoryTeammate[] {
  const seen = new Set<string>();
  const teammates: HistoryTeammate[] = [];
  const ordered = [...doc.matches].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const match of ordered) {
    for (const teammate of match.teammates) {
      const key = teammateKey(teammate);
      if (seen.has(key)) continue;
      seen.add(key);
      teammates.push(teammate);
    }
  }
  return teammates;
}
