import type { Mode } from "@/lib/data/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { ClimbMatchRow } from "@/lib/supabase/database";
import {
  currentSrFromHistory,
  draftFromSourceMatch,
  inviteMatchSummary,
  teammateSlugDiff,
  teammatesForAcceptedMatch,
} from "./invite-draft";
import { rowToMatch } from "./map";
import { appendMatch } from "./sessions";
import { upsertHistoryMatchInCloud } from "./cloud";
import {
  createHistoryStore,
  mergeCloudHistory,
  pushHistoryDocument,
  resolveSignedInUserId,
} from "./synced-store";
import type { HistoryMatch, HistoryTeammate } from "./types";

export type PendingMatchInvite = {
  id: string;
  createdAt: string;
  summary: string;
  mode: Mode;
  inviter: HistoryTeammate;
};

type InviteRecord = {
  id: string;
  source: HistoryMatch;
  inviter: HistoryTeammate;
};

function isMissingMatchInvitesTable(message: string): boolean {
  return /match_invites/i.test(message) && /schema cache|does not exist|relation/i.test(message);
}

function logInviteError(context: string, message: string): void {
  if (isMissingMatchInvitesTable(message)) return;
  console.error(`[match-invites] ${context}`, message);
}

export function patchCalcSr(mode: Mode, sr: number): void {
  if (typeof window === "undefined") return;
  const key = calcKey(mode);
  let stored: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "") as unknown;
    if (parsed && typeof parsed === "object") stored = parsed as Record<string, unknown>;
  } catch {
    stored = {};
  }
  stored.sr = sr;
  stored.srInput = String(sr);
  localStorage.setItem(key, JSON.stringify(stored));
  window.dispatchEvent(new Event(key));
}

function historyTeammateFromProfile(row: {
  display_name: string;
  slug: string;
  avatar_url: string | null;
}): HistoryTeammate {
  return {
    displayName: row.display_name,
    slug: row.slug,
    avatarUrl: row.avatar_url,
  };
}

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseInviteRecord(row: {
  id: string;
  created_at?: string;
  inviter:
    | { display_name: string; slug: string; avatar_url: string | null }
    | { display_name: string; slug: string; avatar_url: string | null }[]
    | null;
  source: ClimbMatchRow | ClimbMatchRow[] | null;
}): InviteRecord | null {
  const inviter = asOne(row.inviter);
  const sourceRow = asOne(row.source);
  if (!inviter || !sourceRow) return null;
  const source = rowToMatch(sourceRow);
  if (!source) return null;
  return {
    id: row.id,
    source,
    inviter: historyTeammateFromProfile(inviter),
  };
}

// Disambiguate climb_matches FK (source_match_id vs accepted_match_id).
const INVITE_SELECT =
  "id, created_at, inviter:profiles!match_invites_inviter_id_fkey(display_name, slug, avatar_url), source:climb_matches!match_invites_source_match_id_fkey(*)";

async function profileIdsForSlugs(
  slugs: string[],
): Promise<Map<string, string>> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase || slugs.length === 0) return new Map();

  const { data, error } = await supabase.from("profiles").select("id, slug").in("slug", slugs);
  if (error || !data) return new Map();

  return new Map(data.map((row) => [row.slug.toLowerCase(), row.id]));
}

async function ensureSourceMatchInCloud(mode: Mode, matchId: string): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return false;
  const userId = await resolveSignedInUserId(supabase);
  if (!userId) return false;

  const { data: existing } = await supabase
    .from("climb_matches")
    .select("id")
    .eq("id", matchId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return true;

  const store = createHistoryStore(mode);
  const doc = store.load();
  const match = doc.matches.find((item) => item.id === matchId);
  if (!match) return false;
  const session = doc.sessions.find((item) => item.id === match.sessionId);
  if (!session) return false;

  return upsertHistoryMatchInCloud(supabase, userId, match, session);
}

export async function syncMatchInvites(args: {
  mode: Mode;
  matchId: string;
  previous: HistoryTeammate[];
  next: HistoryTeammate[];
}): Promise<boolean> {
  const { added, removed } = teammateSlugDiff(args.previous, args.next);
  if (added.length === 0 && removed.length === 0) return true;

  const supabase = createBrowserSupabaseClient();
  if (!supabase) return false;
  const userId = await resolveSignedInUserId(supabase);
  if (!userId) return false;

  const slugs = [...new Set([...added, ...removed])];
  const bySlug = await profileIdsForSlugs(slugs);

  if (removed.length > 0) {
    const inviteeIds = removed
      .map((slug) => bySlug.get(slug))
      .filter((id): id is string => id != null);
    if (inviteeIds.length > 0) {
      await supabase
        .from("match_invites")
        .delete()
        .eq("source_match_id", args.matchId)
        .eq("inviter_id", userId)
        .eq("status", "pending")
        .in("invitee_id", inviteeIds);
    }
  }

  if (added.length === 0) return true;

  const ensured = await ensureSourceMatchInCloud(args.mode, args.matchId);
  if (!ensured) return false;

  const rows = added
    .map((slug) => bySlug.get(slug))
    .filter((id): id is string => id != null && id !== userId)
    .map((inviteeId) => ({
      source_match_id: args.matchId,
      inviter_id: userId,
      invitee_id: inviteeId,
    }));
  if (rows.length === 0) return true;

  const { error } = await supabase.from("match_invites").upsert(rows, {
    onConflict: "source_match_id,invitee_id",
    ignoreDuplicates: true,
  });
  return error == null;
}

export async function retractMatchInvites(matchId: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return;
  const userId = await resolveSignedInUserId(supabase);
  if (!userId) return;

  await supabase
    .from("match_invites")
    .delete()
    .eq("source_match_id", matchId)
    .eq("inviter_id", userId)
    .eq("status", "pending");
}

export async function fetchPendingInvites(): Promise<PendingMatchInvite[]> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return [];
  const userId = await resolveSignedInUserId(supabase);
  if (!userId) return [];

  const { data, error } = await supabase
    .from("match_invites")
    .select(INVITE_SELECT)
    .eq("invitee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    logInviteError("fetch failed", error.message);
    return [];
  }
  if (!data) return [];

  const invites: PendingMatchInvite[] = [];
  for (const row of data) {
    const parsed = parseInviteRecord(row);
    if (!parsed) continue;
    invites.push({
      id: parsed.id,
      createdAt: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      summary: inviteMatchSummary(parsed.source),
      mode: parsed.source.mode,
      inviter: parsed.inviter,
    });
  }
  return invites;
}

export async function acceptMatchInvite(inviteId: string): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return false;
  const userId = await resolveSignedInUserId(supabase);
  if (!userId) return false;

  const { data: row, error } = await supabase
    .from("match_invites")
    .select(INVITE_SELECT)
    .eq("id", inviteId)
    .eq("invitee_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  if (error || !row) return false;

  const parsed = parseInviteRecord(row);
  if (!parsed) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("slug, current_sr")
    .eq("id", userId)
    .maybeSingle();

  const mode = parsed.source.mode;
  await mergeCloudHistory(mode);
  const store = createHistoryStore(mode);
  const srBefore = currentSrFromHistory(store.load(), profile?.current_sr ?? 0);
  const teammates = teammatesForAcceptedMatch({
    inviter: parsed.inviter,
    sourceTeammates: parsed.source.teammates,
    inviteeSlug: profile?.slug ?? null,
  });
  const draft = draftFromSourceMatch(parsed.source, srBefore, teammates);
  if (!draft) return false;

  const result = appendMatch(
    store.load(),
    { ...draft, imported: true },
    new Date(),
    parsed.id,
  );
  if (!store.save(result.doc)) return false;
  const flushed = await pushHistoryDocument(mode, result.doc);
  if (!flushed) return false;

  const { error: updateError } = await supabase
    .from("match_invites")
    .update({
      status: "accepted",
      accepted_match_id: result.match.id,
      responded_at: new Date().toISOString(),
    })
    .eq("id", parsed.id)
    .eq("status", "pending");
  if (updateError) return false;

  patchCalcSr(mode, result.match.srAfter);
  return true;
}

export async function denyMatchInvite(inviteId: string): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return false;
  const userId = await resolveSignedInUserId(supabase);
  if (!userId) return false;

  const { error } = await supabase
    .from("match_invites")
    .update({
      status: "denied",
      responded_at: new Date().toISOString(),
    })
    .eq("id", inviteId)
    .eq("invitee_id", userId)
    .eq("status", "pending");
  return error == null;
}

export function subscribeMatchInvites(onChange: () => void): () => void {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return () => {};

  let cancelled = false;
  let unsubscribe: (() => void) | null = null;

  void resolveSignedInUserId(supabase).then((userId) => {
    if (cancelled || !userId) return;
    const channel = supabase
      .channel(`match-invites:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_invites",
          filter: `invitee_id=eq.${userId}`,
        },
        onChange,
      )
      .subscribe();
    unsubscribe = () => {
      void supabase.removeChannel(channel);
    };
  });

  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}
