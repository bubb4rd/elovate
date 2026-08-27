import type { HistoryTeammate } from "@/lib/history/types";
import { teammateKey } from "@/lib/history/sessions";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { validateDisplayName } from "./slug";

const PROFILE_SEARCH_LIMIT = 8;

function sanitizeIlike(query: string): string {
  return query.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();
}

export function filterRecentTeammates(
  recents: HistoryTeammate[],
  query: string,
): HistoryTeammate[] {
  const q = query.trim().toLowerCase();
  if (!q) return recents;
  return recents.filter((teammate) => {
    if (teammate.displayName.toLowerCase().includes(q)) return true;
    return teammate.slug != null && teammate.slug.toLowerCase().includes(q);
  });
}

export function guestTeammateFromQuery(query: string): HistoryTeammate | null {
  if (validateDisplayName(query) != null) return null;
  return { displayName: query.trim(), slug: null, avatarUrl: null };
}

export async function searchPublicProfiles(
  query: string,
): Promise<HistoryTeammate[]> {
  const sanitized = sanitizeIlike(query);
  if (sanitized.length < 2) return [];

  const supabase = createBrowserSupabaseClient();
  if (!supabase) return [];

  const { data: claimsData } = await supabase.auth.getClaims();
  const viewerId =
    typeof claimsData?.claims?.sub === "string" ? claimsData.claims.sub : null;

  const pattern = `"%${sanitized}%"`;
  let request = supabase
    .from("profiles")
    .select("slug, display_name, avatar_url")
    .eq("is_private", false)
    .or(`display_name.ilike.${pattern},slug.ilike.${pattern}`)
    .limit(PROFILE_SEARCH_LIMIT);

  if (viewerId) request = request.neq("id", viewerId);

  const { data, error } = await request;
  if (error || !data) return [];

  const seen = new Set<string>();
  const results: HistoryTeammate[] = [];
  for (const row of data) {
    const teammate: HistoryTeammate = {
      displayName: row.display_name,
      slug: row.slug,
      avatarUrl: row.avatar_url,
    };
    const key = teammateKey(teammate);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(teammate);
  }
  return results;
}
