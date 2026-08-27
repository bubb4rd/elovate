import type { Mode } from "@/lib/data/types";
import type { ClimbMatchRow, ClimbSessionRow } from "@/lib/supabase/database";
import type { HistoryDocument, HistoryMatch, HistorySession } from "./types";
import { HISTORY_VERSION } from "./types";
import { emptyDocument, normalizeTeammates } from "./sessions";

export function sessionToRow(userId: string, session: HistorySession): ClimbSessionRow {
  return {
    id: session.id,
    user_id: userId,
    mode: session.mode,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    start_sr: session.startSr,
  };
}

export function matchToRow(userId: string, match: HistoryMatch): ClimbMatchRow {
  const base = {
    id: match.id,
    user_id: userId,
    session_id: match.sessionId,
    mode: match.mode,
    created_at: match.createdAt,
    sr_before: match.srBefore,
    sr_after: match.srAfter,
    net: match.net,
    teammates: normalizeTeammates(match.teammates),
  };
  if (match.mode === "wz") {
    return {
      ...base,
      placement: match.placement,
      squad_elims: match.squadElims,
      your_elims: match.yourElims,
      fee: match.fee,
      placement_sr: match.placementSr,
      elim_sr: match.elimSr,
      capped: match.capped,
      sr_per_win: null,
    };
  }
  return {
    ...base,
    placement: null,
    squad_elims: null,
    your_elims: null,
    fee: null,
    placement_sr: null,
    elim_sr: null,
    capped: null,
    sr_per_win: match.srPerWin,
  };
}

export function rowToSession(row: ClimbSessionRow): HistorySession {
  return {
    id: row.id,
    mode: row.mode,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    startSr: row.start_sr,
  };
}

export function rowToMatch(row: ClimbMatchRow): HistoryMatch | null {
  if (row.mode === "wz") {
    if (!row.placement) return null;
    return {
      id: row.id,
      sessionId: row.session_id,
      createdAt: row.created_at,
      srBefore: row.sr_before,
      srAfter: row.sr_after,
      net: row.net,
      mode: "wz",
      placement: row.placement,
      squadElims: row.squad_elims ?? 0,
      yourElims: row.your_elims ?? 0,
      fee: row.fee ?? 0,
      placementSr: row.placement_sr ?? 0,
      elimSr: row.elim_sr ?? 0,
      capped: row.capped ?? false,
      teammates: normalizeTeammates(row.teammates),
    };
  }
  return {
    id: row.id,
    sessionId: row.session_id,
    createdAt: row.created_at,
    srBefore: row.sr_before,
    srAfter: row.sr_after,
    net: row.net,
    mode: "mp",
    srPerWin: row.sr_per_win ?? 0,
    teammates: normalizeTeammates(row.teammates),
  };
}

export function rowsToDocument(
  sessions: ClimbSessionRow[],
  matches: ClimbMatchRow[],
): HistoryDocument {
  const parsed = matches
    .map(rowToMatch)
    .filter((match): match is HistoryMatch => match != null);
  if (sessions.length === 0 && parsed.length === 0) return emptyDocument();
  return {
    version: HISTORY_VERSION,
    sessions: sessions.map(rowToSession),
    matches: parsed,
  };
}

export function documentForMode(doc: HistoryDocument, mode: Mode): HistoryDocument {
  const sessions = doc.sessions.filter((session) => session.mode === mode);
  const ids = new Set(sessions.map((session) => session.id));
  return {
    version: HISTORY_VERSION,
    sessions,
    matches: doc.matches.filter((match) => match.mode === mode && ids.has(match.sessionId)),
  };
}
