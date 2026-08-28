import type { Mode } from "@/lib/data/types";

const LEGACY_CALC_KEY = "elovate-calc-sr";

export type StoredCalc = {
  sr?: number;
  srInput?: string;
  elims?: number;
  elimsInput?: string;
  squadElims?: number;
  squadElimsInput?: string;
  yourElims?: number;
  yourElimsInput?: string;
  rankDelta?: number;
  protection?: number;
  dailyForgive?: boolean;
  srPerWin?: number;
  srPerWinInput?: string;
  srPerLoss?: number;
  srPerLossInput?: string;
  target?: string;
  placement?: string | null;
};

export function calcKey(mode: Mode, userId?: string | null): string {
  if (userId) return `elovate-calc-sr-${mode}-${userId}`;
  return `elovate-calc-sr-${mode}`;
}

export function calcEvent(mode: Mode, userId?: string | null): string {
  return calcKey(mode, userId);
}

export function migrateLegacyCalc(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_CALC_KEY);
    if (legacy == null) return;
    for (const mode of ["wz", "mp"] as const) {
      if (localStorage.getItem(calcKey(mode)) == null) {
        localStorage.setItem(calcKey(mode), legacy);
      }
    }
  } catch {
    /* quota / private mode */
  }
}

export function parseStoredCalc(raw: string): StoredCalc {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StoredCalc;
  } catch {
    return {};
  }
}

export function readCalcRaw(mode: Mode, userId?: string | null): string {
  migrateLegacyCalc();
  try {
    return localStorage.getItem(calcKey(mode, userId)) ?? "";
  } catch {
    return "";
  }
}

export function writeCalcStored(
  mode: Mode,
  userId: string | null | undefined,
  next: StoredCalc,
): void {
  try {
    localStorage.setItem(calcKey(mode, userId), JSON.stringify(next));
    window.dispatchEvent(new Event(calcEvent(mode, userId)));
  } catch {
    /* quota / private mode */
  }
}

export function patchCalcSr(
  mode: Mode,
  sr: number,
  userId?: string | null,
): void {
  if (typeof window === "undefined") return;
  const existing = parseStoredCalc(readCalcRaw(mode, userId));
  writeCalcStored(mode, userId, {
    ...existing,
    sr,
    srInput: String(sr),
  });
}

/** Seed account-scoped calc SR once when no local row exists yet. */
export function ensureCalcSeeded(
  mode: Mode,
  userId: string,
  profileSr: number,
): void {
  if (typeof window === "undefined") return;
  if (!(profileSr > 0)) return;
  try {
    if (localStorage.getItem(calcKey(mode, userId)) != null) return;
  } catch {
    return;
  }
  writeCalcStored(mode, userId, {
    sr: profileSr,
    srInput: String(profileSr),
  });
}

export function subscribeCalc(
  mode: Mode,
  userId: string | null | undefined,
  onStoreChange: () => void,
): () => void {
  const key = calcKey(mode, userId);
  const event = calcEvent(mode, userId);
  function onStorage(e: StorageEvent) {
    if (e.key === key || e.key === null) onStoreChange();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener(event, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(event, onStoreChange);
  };
}
