import type { SupabaseClient } from "@supabase/supabase-js";
import type { Mode } from "@/lib/data/types";
import type { Database } from "@/lib/supabase/database";
import { emptyDocument } from "./sessions";
import { matchToRow, rowsToDocument, sessionToRow } from "./map";
import type { HistoryDocument } from "./types";

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

export async function pushCloudHistory(
  supabase: Client,
  userId: string,
  mode: Mode,
  doc: HistoryDocument,
): Promise<boolean> {
  const sessionRows = doc.sessions.map((session) => sessionToRow(userId, session));
  const matchRows = doc.matches.map((match) => matchToRow(userId, match));
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

  let matchQuery = supabase.from("climb_matches").delete().eq("user_id", userId).eq("mode", mode);
  if (keepMatchIds.length > 0) {
    matchQuery = matchQuery.filter("id", "not.in", `(${keepMatchIds.join(",")})`);
  }
  const { error: deleteMatchError } = await matchQuery;
  if (deleteMatchError) return false;

  let sessionQuery = supabase.from("climb_sessions").delete().eq("user_id", userId).eq("mode", mode);
  if (keepSessionIds.length > 0) {
    sessionQuery = sessionQuery.filter("id", "not.in", `(${keepSessionIds.join(",")})`);
  }
  const { error: deleteSessionError } = await sessionQuery;
  return deleteSessionError == null;
}
