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

export function formatRelativeShort(iso: string, now = Date.now()): string {
  const ms = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function formatChipTime(
  iso: string,
  timeZone = "UTC",
): { date: string; time: string; zone: string } {
  if (timeZone === "UTC") return formatUtcChipTime(iso);
  const date = new Date(iso);
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone,
    hour12: true,
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    hour12: true,
  }).format(date);
  const zonePart =
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
      hour12: true,
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")?.value ?? timeZone;
  return { date: datePart, time: timePart, zone: zonePart };
}

const UTC_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatUtcChipTime(iso: string): {
  date: string;
  time: string;
  zone: "UTC";
} {
  const date = new Date(iso);
  const hours24 = date.getUTCHours();
  const hour12 = hours24 % 12 || 12;
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return {
    date: `${UTC_MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`,
    time: `${hour12}:${minutes} ${hours24 >= 12 ? "PM" : "AM"}`,
    zone: "UTC",
  };
}

export function formatSlashDateTime(
  iso: string,
  timeZone = "UTC",
): { date: string; time: string } {
  const date = new Date(iso);
  if (timeZone === "UTC") {
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours24 = date.getUTCHours();
    const hour12 = hours24 % 12 || 12;
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    return {
      date: `${month}/${day}`,
      time: `${hour12}:${minutes} ${hours24 >= 12 ? "PM" : "AM"}`,
    };
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("month")}/${get("day")}`,
    time: `${get("hour")}:${get("minute")} ${get("dayPeriod")}`.trim(),
  };
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

export function formatShareCardDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
    .format(new Date(iso))
    .replaceAll(",", "");
}
