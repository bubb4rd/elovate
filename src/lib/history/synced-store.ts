import type { Mode } from "@/lib/data/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { fetchCloudHistory, pushCloudHistory } from "./cloud";
import { mergeHistory } from "./merge";
import { createLocalHistoryStore } from "./store";
import type { HistoryDocument, HistoryStore } from "./types";

const PUSH_MS = 600;
const pending = new Map<Mode, ReturnType<typeof setTimeout>>();
const merging = new Set<Mode>();

async function signedInUserId(): Promise<string | null> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? sub : null;
}

async function pullAndMerge(
  mode: Mode,
  local: HistoryStore & { getSnapshot: () => string },
): Promise<void> {
  if (merging.has(mode)) return;
  const supabase = createBrowserSupabaseClient();
  const userId = await signedInUserId();
  if (!supabase || !userId) return;

  merging.add(mode);
  try {
    const cloud = await fetchCloudHistory(supabase, userId, mode);
    const merged = mergeHistory(local.load(), cloud);
    local.save(merged);
    await pushCloudHistory(supabase, userId, mode, merged);
  } finally {
    merging.delete(mode);
  }
}

function schedulePush(mode: Mode, doc: HistoryDocument) {
  const existing = pending.get(mode);
  if (existing) clearTimeout(existing);
  pending.set(
    mode,
    setTimeout(() => {
      pending.delete(mode);
      void (async () => {
        const supabase = createBrowserSupabaseClient();
        const userId = await signedInUserId();
        if (!supabase || !userId) return;
        await pushCloudHistory(supabase, userId, mode, doc);
      })();
    }, PUSH_MS),
  );
}

export function createHistoryStore(mode: Mode): HistoryStore & { getSnapshot: () => string } {
  const local = createLocalHistoryStore(mode);
  return {
    load: () => local.load(),
    save(doc) {
      const ok = local.save(doc);
      if (ok) schedulePush(mode, doc);
      return ok;
    },
    subscribe(onChange) {
      const unsubLocal = local.subscribe(onChange);
      const supabase = createBrowserSupabaseClient();
      const { data } = supabase?.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
          void pullAndMerge(mode, local).then(onChange);
        }
      }) ?? { data: { subscription: { unsubscribe() {} } } };
      void pullAndMerge(mode, local);
      return () => {
        unsubLocal();
        data.subscription.unsubscribe();
      };
    },
    getSnapshot: () => local.getSnapshot(),
  };
}
