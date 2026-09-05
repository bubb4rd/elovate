// Pure helpers for turning timestamped rows into a chart-safe, time-ordered
// series. No React/DOM here — see src/lib/data/live-history.ts for the sibling
// pure-data-module style this follows.

/**
 * Normalizes the fractional-seconds group of a timestamp to exactly 3 digits.
 * Postgres/PostgREST trims trailing zeros (".123", ".12", ".1", or absent),
 * but pre-Chromium WebKit's Date.parse requires exactly 3 fractional digits.
 */
function normalizeFraction(raw: string | undefined): string {
  const digits = raw ? raw.slice(1) : "";
  if (digits.length === 0) return "000";
  if (digits.length >= 3) return digits.slice(0, 3);
  return digits.padEnd(3, "0");
}

/** Normalizes a UTC offset (or absent/Z) to a `Z` or `+HH:MM`/`-HH:MM` form. */
function normalizeOffset(raw: string | undefined): string {
  if (!raw || raw === "Z") return "Z";
  const match = raw.match(/^([+-])(\d{2}):?(\d{2})?$/);
  if (!match) return "Z";
  const [, sign, hh, mm = "00"] = match;
  if (hh === "00" && mm === "00") return "Z";
  return `${sign}${hh}:${mm}`;
}

/**
 * Rewrites a variable-precision Postgres timestamp string into a form that
 * every engine's Date.parse can handle: `T` separator, exactly 3 fractional
 * digits, and a normalized `Z`/`+HH:MM` offset.
 */
function normalizeTimestamp(value: string): string | null {
  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}(?::?\d{2})?)?$/,
  );
  if (!match) return null;
  const [, datePart, timePart, fraction, offsetRaw] = match;
  return `${datePart}T${timePart}.${normalizeFraction(fraction)}${normalizeOffset(offsetRaw)}`;
}

/**
 * Parses a timestamp to epoch milliseconds, tolerating the variable
 * fractional-second precision PostgREST returns for `timestamptz` columns.
 * Never throws — returns `NaN` for anything unparseable.
 */
export function parseTimestamp(value: string): number {
  const direct = Date.parse(value);
  if (Number.isFinite(direct)) return direct;

  const normalized = normalizeTimestamp(value);
  if (normalized === null) return NaN;

  const retried = Date.parse(normalized);
  return Number.isFinite(retried) ? retried : NaN;
}

/**
 * Drops rows with a non-finite `t`, sorts the rest ascending by `t`, and
 * dedupes rows sharing the same `t`, keeping the LAST occurrence from the
 * original array order (so a live point merged at an existing row's
 * timestamp wins, matching prior "replace last" behavior).
 */
export function toSortedRows<T>(rows: T[], getT: (row: T) => number): T[] {
  const finite = rows
    .map((row, index) => ({ row, index, t: getT(row) }))
    .filter((entry) => Number.isFinite(entry.t));

  finite.sort((a, b) => a.t - b.t || a.index - b.index);

  const deduped: typeof finite = [];
  for (const entry of finite) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.t === entry.t) {
      deduped[deduped.length - 1] = entry;
    } else {
      deduped.push(entry);
    }
  }

  return deduped.map((entry) => entry.row);
}
