import type { SupabaseClient } from "@supabase/supabase-js";
import type { Mode } from "@/lib/data/types";
import type { Database } from "@/lib/supabase/database";
import { documentForMode, matchToRow, rowsToDocument, sessionToRow } from "./map";
import { emptyDocument } from "./sessions";
import type { HistoryDocument, HistoryMatch, HistorySession } from "./types";

type Client = SupabaseClient<Database>;

export async function fetchCloudHistory(
  supabase: Client,
  userId: string,
  mode: Mode,
): Promise<HistoryDocument> {
  const [{ data: sessions, error: sessionError }, { data: matches, error: matchError }] =
    await Promise.all([
      supabase.from("climb_sessions").select("*").eq("user_id", userId).eq("mode", mode),
      supabase.from("climb_matches").select("*").eq("user_id", userId).eq("mode", mode),
    ]);
  if (sessionError || matchError) return emptyDocument();
  return rowsToDocument(sessions ?? [], matches ?? []);
}

async function syncProfileCurrentSr(
  supabase: Client,
  userId: string,
  mode: Mode,
  doc: HistoryDocument,
): Promise<boolean> {
  const scoped = documentForMode(doc, mode);
  const latest = [...scoped.matches]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .at(-1);
  if (!latest) return true;

  const { error } = await supabase
    .from("profiles")
    .update({ current_sr: latest.srAfter })
    .eq("id", userId);
  return error == null;
}

/** Upsert a single match (+ session) without pruning other cloud rows. */
export async function upsertHistoryMatchInCloud(
  supabase: Client,
  userId: string,
  match: HistoryMatch,
  session: HistorySession,
): Promise<boolean> {
  const { error: sessionError } = await supabase
    .from("climb_sessions")
    .upsert(sessionToRow(userId, session));
  if (sessionError) return false;

  const { error: matchError } = await supabase
    .from("climb_matches")
    .upsert(matchToRow(userId, match));
  return matchError == null;
}

export async function pushCloudHistory(
  supabase: Client,
  userId: string,
  mode: Mode,
  doc: HistoryDocument,
  options?: { prune?: boolean },
): Promise<boolean> {
  const prune = options?.prune ?? true;
  const scoped = documentForMode(doc, mode);

  if (prune && scoped.matches.length === 0) {
    const cloud = await fetchCloudHistory(supabase, userId, mode);
    if (documentForMode(cloud, mode).matches.length > 0) {
      return false;
    }
  }

  const sessionRows = scoped.sessions.map((session) => sessionToRow(userId, session));
  const matchRows = scoped.matches.map((match) => matchToRow(userId, match));
  const keepSessionIds = sessionRows.map((row) => row.id);
  const keepMatchIds = matchRows.map((row) => row.id);

  if (sessionRows.length > 0) {
    const { error } = await supabase.from("climb_sessions").upsert(sessionRows);
    if (error) return false;
  }
  if (matchRows.length > 0) {
    const { error } = await supabase.from("climb_matches").upsert(matchRows);
    if (error) return false;
  }

  if (!prune) {
    return syncProfileCurrentSr(supabase, userId, mode, scoped);
  }

  if (keepMatchIds.length > 0) {
    const { error: deleteMatchError } = await supabase
      .from("climb_matches")
      .delete()
      .eq("user_id", userId)
      .eq("mode", mode)
      .not("id", "in", `(${keepMatchIds.join(",")})`);
    if (deleteMatchError) return false;
  } else {
    const { error: deleteMatchError } = await supabase
      .from("climb_matches")
      .delete()
      .eq("user_id", userId)
      .eq("mode", mode);
    if (deleteMatchError) return false;
  }

  if (keepSessionIds.length > 0) {
    const { error: deleteSessionError } = await supabase
      .from("climb_sessions")
      .delete()
      .eq("user_id", userId)
      .eq("mode", mode)
      .not("id", "in", `(${keepSessionIds.join(",")})`);
    if (deleteSessionError) return false;
  } else {
    const { error: deleteSessionError } = await supabase
      .from("climb_sessions")
      .delete()
      .eq("user_id", userId)
      .eq("mode", mode);
    if (deleteSessionError) return false;
  }

  return syncProfileCurrentSr(supabase, userId, mode, scoped);
}
