export function formatSr(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDelta(value: number | null): string {
  if (value === null) return "new";
  if (value === 0) return "0";
  return value > 0 ? `+${formatSr(value)}` : formatSr(value);
}

export function formatSignedRank(value: number | null): string {
  if (value === null) return "new";
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : String(value);
}

export function formatSnapshotTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function formatChartTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function snapshotAge(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime();
  const hours = Math.max(0, Math.floor(ms / 3_600_000));
  if (hours < 1) return "<1h";
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  return Math.max(1, Math.round(Math.abs(b - a) / 86_400_000));
}

export function formatLocalTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatLocalDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}
