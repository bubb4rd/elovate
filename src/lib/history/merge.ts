import { enforceCap } from "./sessions";
import {
  HISTORY_VERSION,
  type HistoryDocument,
  type HistoryMatch,
  type HistorySession,
} from "./types";

export function mergeHistory(
  local: HistoryDocument,
  cloud: HistoryDocument,
): HistoryDocument {
  const sessions = new Map<string, HistorySession>();
  for (const session of cloud.sessions) sessions.set(session.id, session);
  for (const session of local.sessions) sessions.set(session.id, session);

  const matches = new Map<string, HistoryMatch>();
  for (const match of cloud.matches) matches.set(match.id, match);
  for (const match of local.matches) matches.set(match.id, match);

  return enforceCap({
    version: HISTORY_VERSION,
    sessions: [...sessions.values()],
    matches: [...matches.values()],
  });
}
