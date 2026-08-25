import {
  HISTORY_VERSION,
  MAX_MATCHES_PER_MODE,
  SESSION_IDLE_MS,
  type HistoryDocument,
  type HistoryMatch,
  type HistorySession,
  type NewMatch,
  type SessionSummary,
} from "./types";

export function emptyDocument(): HistoryDocument {
  return { version: HISTORY_VERSION, sessions: [], matches: [] };
}

export function parseDocument(raw: string): HistoryDocument {
  if (!raw) return emptyDocument();
  try {
    const parsed = JSON.parse(raw) as Partial<HistoryDocument>;
    if (parsed?.version !== HISTORY_VERSION) return emptyDocument();
    if (!Array.isArray(parsed.sessions) || !Array.isArray(parsed.matches)) {
      return emptyDocument();
    }
    return {
      version: HISTORY_VERSION,
      sessions: parsed.sessions,
      matches: parsed.matches,
    };
  } catch {
    return emptyDocument();
  }
}

export function sessionMatches(doc: HistoryDocument, sessionId: string): HistoryMatch[] {
  return doc.matches
    .filter((match) => match.sessionId === sessionId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Current win streak: consecutive games with net > 0 from the end of the list. */
export function winStreak(matches: HistoryMatch[]): number {
  const ordered = [...matches].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let streak = 0;
  for (let i = ordered.length - 1; i >= 0; i--) {
    if (ordered[i]!.net > 0) streak += 1;
    else break;
  }
  return streak;
}

export function summarizeSession(
  session: HistorySession,
  matches: HistoryMatch[],
): SessionSummary {
  const ordered = [...matches].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const last = ordered.at(-1);
  return {
    session,
    matches: ordered,
    games: ordered.length,
    net: ordered.reduce((sum, match) => sum + match.net, 0),
    endSr: last?.srAfter ?? session.startSr,
    streak: winStreak(ordered),
  };
}

export function openSession(doc: HistoryDocument): HistorySession | undefined {
  return doc.sessions.find((session) => session.endedAt == null);
}

export function openSummary(doc: HistoryDocument): SessionSummary | null {
  const session = openSession(doc);
  if (!session) return null;
  return summarizeSession(session, sessionMatches(doc, session.id));
}

export function pastSummaries(doc: HistoryDocument): SessionSummary[] {
  return doc.sessions
    .filter((session) => session.endedAt != null)
    .map((session) => summarizeSession(session, sessionMatches(doc, session.id)))
    .filter((summary) => summary.games > 0)
    .sort((a, b) => b.session.startedAt.localeCompare(a.session.startedAt));
}

function lastActivityIso(session: HistorySession, matches: HistoryMatch[]): string {
  return matches.at(-1)?.createdAt ?? session.startedAt;
}

export function isSessionIdle(
  session: HistorySession,
  matches: HistoryMatch[],
  now: Date,
  idleMs = SESSION_IDLE_MS,
): boolean {
  if (session.endedAt != null) return false;
  return now.getTime() - Date.parse(lastActivityIso(session, matches)) > idleMs;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

export function enforceCap(doc: HistoryDocument): HistoryDocument {
  if (doc.matches.length <= MAX_MATCHES_PER_MODE) return doc;

  const open = openSession(doc);
  const closed = doc.sessions
    .filter((session) => session.id !== open?.id)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const dropIds = new Set<string>();
  let remaining = doc.matches.length;
  for (const session of closed) {
    if (remaining <= MAX_MATCHES_PER_MODE) break;
    const count = doc.matches.filter((match) => match.sessionId === session.id).length;
    dropIds.add(session.id);
    remaining -= count;
  }

  let sessions = doc.sessions.filter((session) => !dropIds.has(session.id));
  let matches = doc.matches.filter((match) => !dropIds.has(match.sessionId));

  if (matches.length > MAX_MATCHES_PER_MODE) {
    matches = [...matches]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(-MAX_MATCHES_PER_MODE);
    const keepIds = new Set(matches.map((match) => match.sessionId));
    if (open) keepIds.add(open.id);
    sessions = sessions.filter((session) => keepIds.has(session.id));
  }

  return { version: HISTORY_VERSION, sessions, matches };
}

export function endSession(
  doc: HistoryDocument,
  sessionId: string,
  endedAt = new Date().toISOString(),
): HistoryDocument {
  const session = doc.sessions.find((item) => item.id === sessionId);
  if (!session || session.endedAt != null) return doc;
  const matches = sessionMatches(doc, sessionId);
  if (matches.length === 0) {
    return {
      version: HISTORY_VERSION,
      sessions: doc.sessions.filter((item) => item.id !== sessionId),
      matches: doc.matches,
    };
  }
  return {
    version: HISTORY_VERSION,
    sessions: doc.sessions.map((item) =>
      item.id === sessionId ? { ...item, endedAt } : item,
    ),
    matches: doc.matches,
  };
}

export function appendMatch(
  doc: HistoryDocument,
  draft: NewMatch,
  now = new Date(),
): { doc: HistoryDocument; match: HistoryMatch; session: HistorySession } {
  const nowIso = now.toISOString();
  let sessions = [...doc.sessions];
  const matches = [...doc.matches];

  let open = sessions.find((session) => session.endedAt == null);
  if (open) {
    const owned = sessionMatches({ ...doc, sessions, matches }, open.id);
    if (isSessionIdle(open, owned, now)) {
      const endedAt = lastActivityIso(open, owned);
      sessions = sessions.map((session) =>
        session.id === open!.id ? { ...session, endedAt } : session,
      );
      open = undefined;
    }
  }

  if (!open) {
    open = {
      id: createId(),
      mode: draft.mode,
      startedAt: nowIso,
      endedAt: null,
      startSr: draft.srBefore,
    };
    sessions.push(open);
  }

  const match = {
    ...draft,
    id: createId(),
    sessionId: open.id,
    createdAt: nowIso,
  } as HistoryMatch;
  matches.push(match);

  const next = enforceCap({ version: HISTORY_VERSION, sessions, matches });
  const session = next.sessions.find((item) => item.id === open!.id) ?? open;
  return { doc: next, match, session };
}

export function canUndoLast(doc: HistoryDocument, currentSr: number): boolean {
  const session = openSession(doc);
  if (!session) return false;
  const last = sessionMatches(doc, session.id).at(-1);
  return last != null && last.srAfter === currentSr;
}

export function undoLastMatch(
  doc: HistoryDocument,
  currentSr: number,
): { doc: HistoryDocument; restoredSr: number; removed: HistoryMatch } | null {
  if (!canUndoLast(doc, currentSr)) return null;
  const session = openSession(doc);
  if (!session) return null;
  const last = sessionMatches(doc, session.id).at(-1);
  if (!last) return null;

  const matches = doc.matches.filter((match) => match.id !== last.id);
  const remainingInSession = matches.some((match) => match.sessionId === session.id);
  const sessions = remainingInSession
    ? doc.sessions
    : doc.sessions.filter((item) => item.id !== session.id);

  return {
    doc: { version: HISTORY_VERSION, sessions, matches },
    restoredSr: last.srBefore,
    removed: last,
  };
}
