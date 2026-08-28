import type { Mode } from "@/lib/data/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";
import { fetchCloudHistory, pushCloudHistory } from "./cloud";
import { mergeHistory } from "./merge";
import { createLocalHistoryStore } from "./store";
import type { HistoryDocument, HistoryStore } from "./types";

const PUSH_MS = 600;
const pending = new Map<Mode, ReturnType<typeof setTimeout>>();
const pendingDoc = new Map<Mode, HistoryDocument>();
const syncFailed = new Map<Mode, boolean>();
const merging = new Set<Mode>();
const pullReady = new Set<Mode>();

type AuthClient = SupabaseClient<Database>;

function syncEvent(mode: Mode): string {
  return `elovate-history-sync-${mode}`;
}

function setSyncFailed(mode: Mode, failed: boolean) {
  if (syncFailed.get(mode) === failed) return;
  syncFailed.set(mode, failed);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(syncEvent(mode)));
  }
}

export async function resolveSignedInUserId(supabase: AuthClient): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const fromSession = sessionData.session?.user.id;
  if (typeof fromSession === "string") return fromSession;

  const { data: claimsData } = await supabase.auth.getClaims();
  const fromClaims = claimsData?.claims?.sub;
  return typeof fromClaims === "string" ? fromClaims : null;
}

async function pushNow(mode: Mode, doc: HistoryDocument): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    setSyncFailed(mode, true);
    return false;
  }

  const userId = await resolveSignedInUserId(supabase);
  if (!userId) {
    setSyncFailed(mode, false);
    return true;
  }

  if (!pullReady.has(mode)) {
    pendingDoc.set(mode, doc);
    return true;
  }

  const ok = await pushCloudHistory(supabase, userId, mode, doc);
  setSyncFailed(mode, !ok);
  return ok;
}

async function flushPush(mode: Mode): Promise<boolean> {
  const timer = pending.get(mode);
  if (timer) {
    clearTimeout(timer);
    pending.delete(mode);
  }
  const doc = pendingDoc.get(mode);
  if (!doc) return true;
  pendingDoc.delete(mode);
  return pushNow(mode, doc);
}

function clearScheduledPush(mode: Mode) {
  pendingDoc.delete(mode);
  const timer = pending.get(mode);
  if (timer) {
    clearTimeout(timer);
    pending.delete(mode);
  }
}

export async function pushHistoryDocument(
  mode: Mode,
  doc: HistoryDocument,
  options?: { prune?: boolean },
): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  if (!supabase) {
    setSyncFailed(mode, true);
    return false;
  }

  const userId = await resolveSignedInUserId(supabase);
  if (!userId) {
    setSyncFailed(mode, false);
    return false;
  }

  if (!pullReady.has(mode) && (options?.prune ?? true)) {
    pendingDoc.set(mode, doc);
    return true;
  }

  const ok = await pushCloudHistory(supabase, userId, mode, doc, options);
  setSyncFailed(mode, !ok);
  if (ok) clearScheduledPush(mode);
  return ok;
}

async function pullAndMerge(
  mode: Mode,
  local: HistoryStore & { getSnapshot: () => string },
  onChange?: () => void,
): Promise<void> {
  if (merging.has(mode)) return;
  const supabase = createBrowserSupabaseClient();
  if (!supabase) return;

  const userId = await resolveSignedInUserId(supabase);
  if (!userId) return;

  merging.add(mode);
  pullReady.delete(mode);
  try {
    await flushPush(mode);
    const cloud = await fetchCloudHistory(supabase, userId, mode);
    const merged = mergeHistory(local.load(), cloud);
    local.save(merged);
    onChange?.();
    const ok = await pushCloudHistory(supabase, userId, mode, merged);
    setSyncFailed(mode, !ok);
  } finally {
    merging.delete(mode);
    pullReady.add(mode);
    const queued = pendingDoc.get(mode);
    if (queued) {
      pendingDoc.delete(mode);
      void pushNow(mode, queued);
    }
  }
}

function schedulePush(mode: Mode, doc: HistoryDocument) {
  pendingDoc.set(mode, doc);
  const existing = pending.get(mode);
  if (existing) clearTimeout(existing);
  pending.set(
    mode,
    setTimeout(() => {
      pending.delete(mode);
      void flushPush(mode);
    }, PUSH_MS),
  );
}

let pageHideRegistered = false;

function registerPageHideFlush() {
  if (pageHideRegistered || typeof window === "undefined") return;
  pageHideRegistered = true;
  window.addEventListener("pagehide", () => {
    for (const mode of pendingDoc.keys()) {
      void flushPush(mode);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden") return;
    for (const mode of pendingDoc.keys()) {
      void flushPush(mode);
    }
  });
}

export async function flushHistoryPush(mode: Mode): Promise<boolean> {
  return flushPush(mode);
}

export async function mergeCloudHistory(mode: Mode): Promise<void> {
  const local = createLocalHistoryStore(mode);
  await pullAndMerge(mode, local);
}

export function createHistoryStore(mode: Mode): HistoryStore & {
  getSnapshot: () => string;
  getSyncFailed: () => boolean;
  subscribeSync: (onChange: () => void) => () => void;
} {
  registerPageHideFlush();
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
        if (
          event === "SIGNED_IN" ||
          event === "USER_UPDATED" ||
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED"
        ) {
          void pullAndMerge(mode, local, onChange);
        }
      }) ?? { data: { subscription: { unsubscribe() {} } } };
      void pullAndMerge(mode, local, onChange);
      return () => {
        unsubLocal();
        data.subscription.unsubscribe();
      };
    },
    getSnapshot: () => local.getSnapshot(),
    getSyncFailed: () => syncFailed.get(mode) ?? false,
    subscribeSync(onChange) {
      if (typeof window === "undefined") return () => {};
      const eventName = syncEvent(mode);
      window.addEventListener(eventName, onChange);
      return () => window.removeEventListener(eventName, onChange);
    },
  };
}
