"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Mode } from "@/lib/data/types";
import { parseDocument } from "./sessions";
import { createHistoryStore, flushHistoryPush } from "./synced-store";

export function useHistory(mode: Mode) {
  const store = useMemo(() => createHistoryStore(mode), [mode]);
  const raw = useSyncExternalStore(store.subscribe, store.getSnapshot, () => "");
  const cloudSyncFailed = useSyncExternalStore(
    store.subscribeSync,
    store.getSyncFailed,
    () => false,
  );
  const retrySync = useCallback(async () => flushHistoryPush(mode), [mode]);
  return { doc: parseDocument(raw), store, cloudSyncFailed, retrySync };
}
