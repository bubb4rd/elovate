import { formatDelta, formatShareCardDay } from "@/lib/format";
import type { SessionSummary } from "./types";

export const SESSION_SHARE_WIDTH = 600;
export const SESSION_SHARE_HEIGHT = 209;
export const SESSION_SHARE_RADIUS = 20;

export type SessionShareCopy = {
  netLabel: string;
  gamesLabel: string;
  dateLabel: string;
  modeLabel: string;
  playlistLabel: string;
  alt: string;
};

export function formatShareDay(iso: string): string {
  return formatShareCardDay(iso);
}

export function shareModeLabel(mode: SessionSummary["session"]["mode"]): string {
  return mode === "wz" ? "Resurgence" : "Multiplayer";
}

export function shareCardCopy(summary: SessionSummary): SessionShareCopy {
  const dateLabel = formatShareDay(summary.session.startedAt);
  const gamesLabel = `${summary.games} game${summary.games === 1 ? "" : "s"}`;
  const modeLabel = shareModeLabel(summary.session.mode);
  const netLabel = formatDelta(summary.net);
  const playlistLabel = "Ranked";
  return {
    netLabel,
    gamesLabel,
    dateLabel,
    modeLabel,
    playlistLabel,
    alt: `${modeLabel} ${playlistLabel} session ${netLabel} SR · ${dateLabel} · ${gamesLabel}`,
  };
}

export function shareFilename(summary: SessionSummary): string {
  const started = new Date(summary.session.startedAt);
  const year = started.getFullYear();
  const month = String(started.getMonth() + 1).padStart(2, "0");
  const day = String(started.getDate()).padStart(2, "0");
  const mode = summary.session.mode === "wz" ? "resurgence" : "multiplayer";
  return `elovate-${mode}-${year}-${month}-${day}.png`;
}
