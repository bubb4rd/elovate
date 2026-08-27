import { DIVISIONS } from "@/lib/ranked";
import type { ProfilePeaks } from "./types";

export const PROFILE_HEADER_IDS = [
  "default",
  "platinum",
  "diamond",
  "crimson",
  "iridescent",
  "elovate-staff",
  "fragger",
] as const;

export type ProfileHeaderId = (typeof PROFILE_HEADER_IDS)[number];

/** Capability grants stored in `profile_grants` — not the same as header ids. */
export const PROFILE_GRANT_IDS = ["elovate-staff"] as const;

export type ProfileGrantId = (typeof PROFILE_GRANT_IDS)[number];

/** Which exclusive headers each grant unlocks. */
export const GRANT_UNLOCKS_HEADERS: Record<
  ProfileGrantId,
  readonly ProfileHeaderId[]
> = {
  "elovate-staff": ["elovate-staff", "fragger"],
};

export type HeaderKind = "default" | "rank" | "exclusive";

export type ProfileHeaderDef = {
  id: ProfileHeaderId;
  label: string;
  kind: HeaderKind;
  minSr: number | null;
  ink: "black" | "white";
};

const RANK_MIN_SR: Record<Extract<ProfileHeaderId, "platinum" | "diamond" | "crimson" | "iridescent">, number> =
  {
    platinum: divisionMinSr("platinum"),
    diamond: divisionMinSr("diamond"),
    crimson: divisionMinSr("crimson"),
    iridescent: divisionMinSr("iridescent"),
  };

function divisionMinSr(
  id: "platinum" | "diamond" | "crimson" | "iridescent",
): number {
  const division = DIVISIONS.find((entry) => entry.id === id);
  if (!division) throw new Error(`Missing division ${id}`);
  return division.minSr;
}

export const PROFILE_HEADERS: readonly ProfileHeaderDef[] = [
  { id: "default", label: "Default", kind: "default", minSr: null, ink: "white" },
  {
    id: "platinum",
    label: "Platinum",
    kind: "rank",
    minSr: RANK_MIN_SR.platinum,
    ink: "black",
  },
  {
    id: "diamond",
    label: "Diamond",
    kind: "rank",
    minSr: RANK_MIN_SR.diamond,
    ink: "white",
  },
  {
    id: "crimson",
    label: "Crimson",
    kind: "rank",
    minSr: RANK_MIN_SR.crimson,
    ink: "white",
  },
  {
    id: "iridescent",
    label: "Iridescent",
    kind: "rank",
    minSr: RANK_MIN_SR.iridescent,
    ink: "black",
  },
  {
    id: "elovate-staff",
    label: "elovate Staff",
    kind: "exclusive",
    minSr: null,
    ink: "black",
  },
  {
    id: "fragger",
    label: "Fragger",
    kind: "exclusive",
    minSr: null,
    ink: "black",
  },
];

const HEADER_BY_ID = new Map(PROFILE_HEADERS.map((header) => [header.id, header]));
const GRANT_BY_ID = new Set<string>(PROFILE_GRANT_IDS);

export function isProfileHeaderId(value: string): value is ProfileHeaderId {
  return HEADER_BY_ID.has(value as ProfileHeaderId);
}

export function isProfileGrantId(value: string): value is ProfileGrantId {
  return GRANT_BY_ID.has(value);
}

export function headerDef(id: ProfileHeaderId): ProfileHeaderDef {
  return HEADER_BY_ID.get(id)!;
}

/** Headers unlocked by the given grants (exclusive cosmetics). */
export function headersUnlockedByGrants(
  grantedIds: readonly ProfileGrantId[],
): ProfileHeaderId[] {
  const unlocked = new Set<ProfileHeaderId>();
  for (const grantId of grantedIds) {
    const headers = GRANT_UNLOCKS_HEADERS[grantId];
    if (!headers) continue;
    for (const headerId of headers) unlocked.add(headerId);
  }
  return [...unlocked];
}

export function peakSrForHeaders(peaks: ProfilePeaks, currentSr: number): number {
  return Math.max(peaks.allTimePeakSr ?? 0, peaks.seasonPeakSr ?? 0, currentSr);
}

export function ownedHeaderIds(
  peakSr: number,
  grantedIds: readonly ProfileGrantId[] = [],
): ProfileHeaderId[] {
  const unlocked = new Set(headersUnlockedByGrants(grantedIds));
  return PROFILE_HEADERS.filter((header) => {
    if (header.kind === "default") return true;
    if (header.kind === "rank") return header.minSr != null && peakSr >= header.minSr;
    return unlocked.has(header.id);
  }).map((header) => header.id);
}

export function resolveEquippedHeaderId(
  equippedHeaderId: string | null | undefined,
  owned: readonly ProfileHeaderId[],
): ProfileHeaderId {
  if (equippedHeaderId && isProfileHeaderId(equippedHeaderId) && owned.includes(equippedHeaderId)) {
    return equippedHeaderId;
  }
  return "default";
}

export function headerState(input: {
  peakSr: number;
  grantedIds?: readonly ProfileGrantId[];
  /** @deprecated Prefer `grantedIds` */
  grantedHeaderIds?: readonly ProfileGrantId[];
  equippedHeaderId?: string | null;
}): { ownedHeaderIds: ProfileHeaderId[]; equippedHeaderId: ProfileHeaderId } {
  const granted = input.grantedIds ?? input.grantedHeaderIds ?? [];
  const owned = ownedHeaderIds(input.peakSr, granted);
  return {
    ownedHeaderIds: owned,
    equippedHeaderId: resolveEquippedHeaderId(input.equippedHeaderId, owned),
  };
}

export const EQUIPPED_HEADER_STORAGE_PREFIX = "elovate:profile-header:";

export function equippedHeaderStorageKey(slug: string): string {
  return `${EQUIPPED_HEADER_STORAGE_PREFIX}${slug}`;
}

export function readStoredEquippedHeader(slug: string): ProfileHeaderId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(equippedHeaderStorageKey(slug));
    return raw && isProfileHeaderId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredEquippedHeader(slug: string, id: ProfileHeaderId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(equippedHeaderStorageKey(slug), id);
  } catch {
    /* ignore quota / private mode */
  }
}
