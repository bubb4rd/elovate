import type { Mode } from "@/lib/data/types";
import type { WzPlacementId } from "@/lib/ranked";

export const HISTORY_VERSION = 1;
export const SESSION_IDLE_MS = 2 * 60 * 60 * 1000;
export const MAX_MATCHES_PER_MODE = 500;
export const MAX_TEAMMATES_PER_MATCH = 3;
export const MAX_RECENT_TEAMMATES = 8;
export const TEAMMATE_NAME_MAX_LEN = 40;

export type HistoryTeammate = {
  displayName: string;
  slug: string | null;
  avatarUrl: string | null;
};

export type HistorySession = {
  id: string;
  mode: Mode;
  startedAt: string;
  endedAt: string | null;
  startSr: number;
};

type HistoryMatchBase = {
  id: string;
  sessionId: string;
  createdAt: string;
  srBefore: number;
  srAfter: number;
  net: number;
  teammates: HistoryTeammate[];
};

export type WzHistoryMatch = HistoryMatchBase & {
  mode: "wz";
  placement: WzPlacementId;
  squadElims: number;
  yourElims: number;
  fee: number;
  placementSr: number;
  elimSr: number;
  capped: boolean;
};

export type MpHistoryMatch = HistoryMatchBase & {
  mode: "mp";
  srPerWin: number;
};

export type HistoryMatch = WzHistoryMatch | MpHistoryMatch;

export type NewMatch =
  | (Omit<WzHistoryMatch, "id" | "sessionId" | "createdAt" | "teammates"> & {
      teammates?: HistoryTeammate[];
    })
  | (Omit<MpHistoryMatch, "id" | "sessionId" | "createdAt" | "teammates"> & {
      teammates?: HistoryTeammate[];
    });

export type HistoryDocument = {
  version: typeof HISTORY_VERSION;
  sessions: HistorySession[];
  matches: HistoryMatch[];
};

export type SessionSummary = {
  session: HistorySession;
  matches: HistoryMatch[];
  games: number;
  net: number;
  endSr: number;
  /** Consecutive positive-net matches ending at the latest game. */
  streak: number;
};

export type HistoryStore = {
  load(): HistoryDocument;
  save(doc: HistoryDocument): boolean;
  subscribe(onChange: () => void): () => void;
};
