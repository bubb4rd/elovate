"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Mode } from "@/lib/data/types";
import { parseDocument } from "./sessions";
import { createHistoryStore } from "./synced-store";

export function useHistory(mode: Mode) {
  const store = useMemo(() => createHistoryStore(mode), [mode]);
  const raw = useSyncExternalStore(store.subscribe, store.getSnapshot, () => "");
  return { doc: parseDocument(raw), store };
}
