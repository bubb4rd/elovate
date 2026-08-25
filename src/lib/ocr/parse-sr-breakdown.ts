import type { ParseCoreFields } from "./types";
import { OcrHardFailure } from "./types";
import { validateBreakdown } from "./validate-breakdown";
import type { ParsedSrBreakdown } from "./types";

const SIGNED_INT = /([+-]?\d{1,4})/g;

function normalize(text: string): string {
  return text
    .replace(/\u2212/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function linesOf(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => normalize(line))
    .filter(Boolean);
}

function firstSignedInt(chunk: string): number | undefined {
  const match = chunk.match(/([+-]?\d{1,4})/);
  if (!match) return undefined;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : undefined;
}

function absInt(n: number | undefined): number | undefined {
  if (n == null) return undefined;
  return Math.abs(Math.trunc(n));
}

function findNearLabel(
  lines: string[],
  labelTest: (line: string) => boolean,
): number | undefined {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!labelTest(line)) continue;
    const same = firstSignedInt(line.replace(/^.*?([a-z])/i, "$1"));
    // Prefer number after the label words on the same line
    const afterLabel = line.replace(/^.*?(deployment|fee|placement|eliminations?|total|match)\b/i, "");
    const fromAfter = firstSignedInt(afterLabel);
    if (fromAfter != null) return fromAfter;
    if (same != null && /\d/.test(line)) {
      const all = [...line.matchAll(SIGNED_INT)].map((m) => Number(m[1]));
      const last = all[all.length - 1];
      if (last != null && Number.isFinite(last)) return last;
    }
    const next = lines[i + 1];
    if (next) {
      const n = firstSignedInt(next);
      if (n != null) return n;
    }
  }
  return undefined;
}

function isFeeLabel(line: string): boolean {
  const l = line.toLowerCase();
  return l.includes("deployment") || (l.includes("fee") && !l.includes("free"));
}

function isPlacementLabel(line: string): boolean {
  const l = line.toLowerCase();
  return l.includes("placement") && !l.includes("elimin");
}

function isElimLabel(line: string): boolean {
  const l = line.toLowerCase();
  if (l.includes("your") || l.includes("squad")) return false;
  return l.includes("elimination");
}

function isYourElimLabel(line: string): boolean {
  const l = line.toLowerCase();
  return l.includes("your") && (l.includes("elim") || l.includes("elimination"));
}

function isSquadElimLabel(line: string): boolean {
  const l = line.toLowerCase();
  return l.includes("squad") && (l.includes("elim") || l.includes("elimination"));
}

function isTotalLabel(line: string): boolean {
  const l = line.toLowerCase();
  return (
    l === "total" ||
    l.startsWith("total ") ||
    l.includes("match total") ||
    (l.includes("total") && !l.includes("elimination") && !l.includes("placement"))
  );
}

/** Extract core SR fields from Vision OCR full text. */
export function parseSrFieldsFromText(rawText: string): ParseCoreFields {
  const text = normalize(rawText);
  if (!text) return {};

  const lines = linesOf(rawText);
  const fields: ParseCoreFields = {};

  const feeRaw = findNearLabel(lines, isFeeLabel);
  const placementRaw = findNearLabel(lines, isPlacementLabel);
  const elimRaw = findNearLabel(lines, isElimLabel);
  const totalRaw = findNearLabel(lines, isTotalLabel);
  const yourRaw = findNearLabel(lines, isYourElimLabel);
  const squadRaw = findNearLabel(lines, isSquadElimLabel);

  if (feeRaw != null) fields.fee = absInt(feeRaw);
  if (placementRaw != null) fields.placementSr = absInt(placementRaw);
  if (elimRaw != null) fields.elimSr = absInt(elimRaw);
  if (totalRaw != null) fields.net = Math.trunc(totalRaw);
  if (yourRaw != null) fields.yourElimSr = absInt(yourRaw);
  if (squadRaw != null) fields.squadElimSr = absInt(squadRaw);

  return fields;
}

export function parseSrBreakdown(
  rawText: string,
  opts?: { expectedFee?: number | null },
): ParsedSrBreakdown {
  const fields = parseSrFieldsFromText(rawText);
  return validateBreakdown(fields, opts);
}

export function assertReadableSrText(rawText: string): void {
  if (!normalize(rawText)) throw new OcrHardFailure();
}
