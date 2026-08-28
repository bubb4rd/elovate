import type { Mode } from "@/lib/data/types";
import { emptyDocument, enforceCap, parseDocument } from "./sessions";
import type { HistoryDocument, HistoryStore } from "./types";

export function historyKey(mode: Mode, userId?: string | null): string {
  if (userId) return `elovate-history-${mode}-${userId}`;
  return `elovate-history-${mode}`;
}

function historyEvent(mode: Mode, userId?: string | null): string {
  return historyKey(mode, userId);
}

export function createLocalHistoryStore(
  mode: Mode,
  userId?: string | null,
): HistoryStore & {
  getSnapshot: () => string;
} {
  const key = historyKey(mode, userId);
  const eventName = historyEvent(mode, userId);

  return {
    load() {
      if (typeof window === "undefined") return emptyDocument();
      try {
        return parseDocument(localStorage.getItem(key) ?? "");
      } catch {
        return emptyDocument();
      }
    },
    save(doc: HistoryDocument) {
      if (typeof window === "undefined") return false;
      try {
        localStorage.setItem(key, JSON.stringify(enforceCap(doc)));
        window.dispatchEvent(new Event(eventName));
        return true;
      } catch {
        return false;
      }
    },
    subscribe(onChange: () => void) {
      if (typeof window === "undefined") return () => {};
      function onStorage(event: StorageEvent) {
        if (event.key === key || event.key === null) onChange();
      }
      window.addEventListener("storage", onStorage);
      window.addEventListener(eventName, onChange);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(eventName, onChange);
      };
    },
    getSnapshot() {
      if (typeof window === "undefined") return "";
      try {
        return localStorage.getItem(key) ?? "";
      } catch {
        return "";
      }
    },
  };
}
