export type Mode = "mp" | "wz";

export type Season = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
};

export type Player = {
  id: string;
  slug: string;
  displayName: string;
};

export type SnapshotSource = "seed" | "codmunity";

export type Snapshot = {
  id: string;
  seasonId: string;
  mode: Mode;
  capturedAt: string;
  source: SnapshotSource;
  cutoffSr: number;
  rank1Sr: number;
};

export type SnapshotPlayer = {
  snapshotId: string;
  rank: number;
  playerId: string;
  sr: number;
};

export type BoardRow = {
  rank: number;
  player: Player;
  sr: number;
  deltaSr: number | null;
  deltaRank: number | null;
  lastSeen: string;
  isCutoff: boolean;
};

export type BoardRung = {
  rank: number;
  sr: number;
};

export type CutoffPoint = {
  capturedAt: string;
  cutoffSr: number;
  rank1Sr: number;
  deltaCutoff: number | null;
};

export type BoardMetrics = {
  cutoffSr: number;
  change24h: number | null;
  avgPerDaySeason: number;
  avgPerDay7d: number;
  playersSampled: number;
  capturedAt: string;
};

export type BoardFreshness = {
  fetchedAt: string;
  nextUpdateAt: string;
  live: boolean;
};

export type LiveWzBoard = {
  rows: BoardRow[];
  ladder: BoardRung[];
  cutoffSr: number;
  rank1Sr: number;
  fetchedAt: string;
  nextUpdateAt: string;
};
