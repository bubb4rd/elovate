import { DIVISIONS } from "@/lib/ranked";
import type { ProfilePeaks } from "./types";

export const PROFILE_HEADER_IDS = [
  "default",
  "platinum",
  "diamond",
  "crimson",
  "iridescent",
  "elovate-staff",
] as const;

export type ProfileHeaderId = (typeof PROFILE_HEADER_IDS)[number];

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
];

const HEADER_BY_ID = new Map(PROFILE_HEADERS.map((header) => [header.id, header]));

export function isProfileHeaderId(value: string): value is ProfileHeaderId {
  return HEADER_BY_ID.has(value as ProfileHeaderId);
}

export function headerDef(id: ProfileHeaderId): ProfileHeaderDef {
  return HEADER_BY_ID.get(id)!;
}

export function peakSrForHeaders(peaks: ProfilePeaks, currentSr: number): number {
  return Math.max(peaks.allTimePeakSr ?? 0, peaks.seasonPeakSr ?? 0, currentSr);
}

export function ownedHeaderIds(
  peakSr: number,
  grantedHeaderIds: readonly ProfileHeaderId[] = [],
): ProfileHeaderId[] {
  const granted = new Set(grantedHeaderIds);
  return PROFILE_HEADERS.filter((header) => {
    if (header.kind === "default") return true;
    if (header.kind === "rank") return header.minSr != null && peakSr >= header.minSr;
    return granted.has(header.id);
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
  grantedHeaderIds?: readonly ProfileHeaderId[];
  equippedHeaderId?: string | null;
}): { ownedHeaderIds: ProfileHeaderId[]; equippedHeaderId: ProfileHeaderId } {
  const owned = ownedHeaderIds(input.peakSr, input.grantedHeaderIds);
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
