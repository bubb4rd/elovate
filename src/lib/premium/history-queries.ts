import { cache } from "react";
import { getViewerProfile } from "@/lib/auth/viewer";
import { emptyDocument, type HistoryDocument } from "@/lib/history";
import { fetchCloudHistory } from "@/lib/history/cloud";
import { documentForMode } from "@/lib/history/map";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * elovate Pro analytics — server-side climb history reads (PREM-01+).
 *
 * Runs over the viewer's own `climb_sessions` / `climb_matches` (owner-only
 * RLS, no new read surface). Pro is a signed-in feature and the client keeps
 * these tables synced, so the cloud copy is the source of truth here.
 */

/** The viewer's full WZ climb history as a `HistoryDocument`. Request-cached. */
export const getViewerWzHistory = cache(async (): Promise<HistoryDocument> => {
  const viewer = await getViewerProfile();
  if (!viewer) return emptyDocument();

  const supabase = await createServerSupabaseClient();
  if (!supabase) return emptyDocument();

  const doc = await fetchCloudHistory(supabase, viewer.id, "wz");
  return documentForMode(doc, "wz");
});
