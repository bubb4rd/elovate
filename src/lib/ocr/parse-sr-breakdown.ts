import { DIVISIONS } from "@/lib/ranked";
import { isValidPlacementSr } from "./placement-from-sr";
import type { ParseCoreFields } from "./types";
import { OcrHardFailure } from "./types";
import { validateBreakdown } from "./validate-breakdown";
import type { ParsedSrBreakdown } from "./types";

const SIGNED_DELTA = /(?<![A-Za-z0-9])[+-]\d{1,4}(?![A-Za-z0-9])/g;
const BARE_VALUE = /^[+-]?\d{1,4}(?:\s*sr)?$/i;
const SR_DELTA_CAP = 300;
const FEE_MAX = 220;

const VALID_WZ_FEES: ReadonlySet<number> = (() => {
  const fees = new Set<number>();
  for (const div of DIVISIONS) {
    if (!div.fees) continue;
    for (const fee of div.fees) fees.add(fee);
  }
  for (let fee = 120; fee <= FEE_MAX; fee += 10) fees.add(fee);
  return fees;
})();

function isValidWzFee(n: number): boolean {
  return VALID_WZ_FEES.has(n);
}

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

function srDeltas(line: string): number[] {
  return [...line.matchAll(SIGNED_DELTA)]
    .map((m) => Number(m[0]))
    .filter((n) => Number.isFinite(n));
}

function firstSignedInt(chunk: string): number | undefined {
  const match = chunk.match(/[+-]?\d{1,4}/);
  if (!match) return undefined;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : undefined;
}

function absInt(n: number | undefined): number | undefined {
  if (n == null) return undefined;
  return Math.abs(Math.trunc(n));
}

function isBareValue(line: string): boolean {
  return BARE_VALUE.test(line.trim());
}

function isWatermarkAt(lines: string[], i: number): boolean {
  const line = lines[i]!;
  const next = lines[i + 1];
  if (!next || srDeltas(line).length) return false;
  if (isPlacementLabel(line) && isPlacementLabel(next)) return true;
  if (isElimLabel(line) && (isElimLabel(next) || isSquadElimLabel(next))) return true;
  return false;
}

function isFeeLabel(line: string): boolean {
  const l = line.toLowerCase();
  if (l.includes("free") || l.includes("placement")) return false;
  return /\bdeployment\b/.test(l) || /\bfee\b/.test(l);
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

function competingLabel(line: string, current: "fee" | "placement" | "elim" | "your" | "squad" | "total"): boolean {
  if (current !== "fee" && isFeeLabel(line)) return true;
  if (current !== "placement" && isPlacementLabel(line)) return true;
  if (current !== "elim" && isElimLabel(line)) return true;
  if (current !== "your" && isYourElimLabel(line)) return true;
  if (current !== "squad" && isSquadElimLabel(line)) return true;
  if (current !== "total" && isTotalLabel(line)) return true;
  return false;
}

function neighborValue(
  line: string | undefined,
  current: "fee" | "placement" | "elim" | "your" | "squad" | "total",
  pick: (deltas: number[]) => number | undefined,
  allowCompeting: boolean,
): number | undefined {
  if (!line) return undefined;
  if (!allowCompeting && competingLabel(line, current) && !isBareValue(line)) return undefined;
  if (isBareValue(line) || srDeltas(line).length > 0) {
    const d = srDeltas(line);
    if (d.length) return pick(d);
    return firstSignedInt(line);
  }
  return undefined;
}

function fromNeighbor(
  lines: string[],
  i: number,
  current: "fee" | "placement" | "elim" | "your" | "squad" | "total",
  pick: (deltas: number[]) => number | undefined,
): number | undefined {
  const fromNext = neighborValue(lines[i + 1], current, pick, false);
  if (fromNext != null) return fromNext;
  return neighborValue(lines[i - 1], current, pick, false);
}

function pickLast(deltas: number[]): number | undefined {
  return deltas[deltas.length - 1];
}

function pickPlacementBucket(deltas: number[]): number | undefined {
  const hit = deltas.find((d) => isValidPlacementSr(Math.abs(d)));
  return hit != null ? Math.abs(hit) : undefined;
}

function valueOnLine(
  line: string,
  pick: (deltas: number[]) => number | undefined,
): number | undefined {
  const deltas = srDeltas(line);
  if (deltas.length) return pick(deltas);
  return undefined;
}

function findNearLabel(
  lines: string[],
  labelTest: (line: string) => boolean,
  current: "fee" | "placement" | "elim" | "your" | "squad" | "total",
  pick: (deltas: number[]) => number | undefined,
): number | undefined {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!labelTest(line)) continue;
    if (isWatermarkAt(lines, i)) continue;
    const onLine = valueOnLine(line, pick);
    if (onLine != null) return onLine;
    const nearby = fromNeighbor(lines, i, current, pick);
    if (nearby != null) return nearby;
  }
  return undefined;
}

function findPlacement(lines: string[]): number | undefined {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!isPlacementLabel(line)) continue;
    if (isWatermarkAt(lines, i)) continue;
    const onLine = valueOnLine(line, pickPlacementBucket);
    if (onLine != null) return onLine;
    const nearby = fromNeighbor(lines, i, "placement", pickPlacementBucket);
    if (nearby != null && isValidPlacementSr(Math.abs(nearby))) return Math.abs(nearby);
  }
  return undefined;
}

function findTotal(lines: string[]): number | undefined {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!isTotalLabel(line)) continue;
    const onLine = valueOnLine(line, pickLast);
    if (onLine != null) return Math.trunc(onLine);
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
      const candidate = lines[j]!;
      const deltas = srDeltas(candidate);
      if (!deltas.length) {
        if (isBareValue(candidate)) {
          const n = firstSignedInt(candidate);
          if (n != null) return Math.trunc(n);
        }
        if (competingLabel(candidate, "total")) break;
        continue;
      }
      const notBucket = deltas.find((d) => !isValidPlacementSr(Math.abs(d)));
      if (notBucket != null) return Math.trunc(notBucket);
      if (!isPlacementLabel(candidate) && !isElimLabel(candidate) && !isFeeLabel(candidate)) {
        return Math.trunc(deltas[deltas.length - 1]!);
      }
      break;
    }
    const prev = lines[i - 1];
    if (prev && (isBareValue(prev) || srDeltas(prev).length)) {
      const d = srDeltas(prev);
      const n = d.length ? d[d.length - 1] : firstSignedInt(prev);
      if (n != null) return Math.trunc(n);
    }
  }
  return undefined;
}

function overlaySlice(lines: string[]): string[] {
  const matchIdx = lines.findIndex((line) => /match total/i.test(line));
  if (matchIdx < 0) return lines;
  const prev = lines[matchIdx - 1];
  const start =
    prev && (isBareValue(prev) || srDeltas(prev).length > 0) ? matchIdx - 1 : matchIdx;
  let end = lines.length;
  for (let i = matchIdx + 1; i < lines.length; i++) {
    const l = lines[i]!.toLowerCase();
    if (/searching for a match|\bping\b|open aar|\bcancel\b/.test(l)) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end);
}

/** Red −110 on a red background often comes back as HO / H0 / 11O. */
function decodeFeeGlyph(token: string): number | undefined {
  const stripped = token.replace(/^[+-]/, "");
  const mapped = stripped.replace(/[Oo]/g, "0").replace(/[Il|]/g, "1").replace(/H/g, "11");
  if (!/^\d+$/.test(mapped)) return undefined;
  const n = Number(mapped);
  if (!Number.isFinite(n) || !isValidWzFee(n)) return undefined;
  return n;
}

function feeFromLine(line: string | undefined, allowUnsigned: boolean): number | undefined {
  if (!line) return undefined;
  const signed = srDeltas(line);
  const neg = signed.filter((n) => n < 0);
  if (neg.length) return Math.abs(neg[neg.length - 1]!);
  if (signed.some((n) => n > 0)) return undefined;
  const token = line.match(/([A-Za-z0-9]+)\s*SR\b/i)?.[1];
  if (!token) return undefined;
  if (/[A-Za-z]/.test(token)) return decodeFeeGlyph(token);
  if (allowUnsigned && /^\d{1,3}$/.test(token)) {
    const n = Number(token);
    if (isValidWzFee(n)) return n;
  }
  return undefined;
}

function findFee(lines: string[]): number | undefined {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!isFeeLabel(line)) continue;
    const onLine = feeFromLine(line, true);
    if (onLine != null) return onLine;
    const next = lines[i + 1];
    if (next && !isPlacementLabel(next) && !isElimLabel(next) && !isTotalLabel(next)) {
      const fromNext = feeFromLine(next, isFeeLabel(next));
      if (fromNext != null) return fromNext;
    }
    const nearby = fromNeighbor(lines, i, "fee", (deltas) => {
      const lastNeg = [...deltas].reverse().find((n) => n < 0);
      return lastNeg;
    });
    if (nearby != null) return absInt(nearby);
  }
  return undefined;
}

function extractSignedSrDeltas(text: string): number[] {
  const out: number[] = [];
  for (const match of text.matchAll(SIGNED_DELTA)) {
    const n = Number(match[0]);
    if (!Number.isFinite(n)) continue;
    if (Math.abs(n) > SR_DELTA_CAP) continue;
    out.push(Math.trunc(n));
  }
  return out;
}

function looksLikeWzOverlay(text: string, deltas: number[]): boolean {
  const lower = text.toLowerCase();
  if (lower.includes("match total")) return true;
  if (deltas.length >= 3 && deltas[0]! > 0 && deltas[deltas.length - 1]! < 0) return true;
  return false;
}

function lastNegativeIndex(deltas: number[]): number {
  for (let i = deltas.length - 1; i >= 0; i--) {
    if (deltas[i]! < 0) return i;
  }
  return -1;
}

function collapseDuplicateDeltas(deltas: number[]): number[] {
  const out: number[] = [];
  for (const n of deltas) {
    if (out[out.length - 1] === n) continue;
    out.push(n);
  }
  return out;
}

/**
 * WZ overlay is always Match total → Placement → Eliminations → (Squad) → Deployment fee,
 * with the SR amount to the right of each label. Vision often emits those as a left
 * column then a right column, so neighbor matching binds the wrong row. Assign signed
 * deltas in document order instead.
 */
function fieldsFromOverlayDeltas(rawDeltas: number[]): ParseCoreFields {
  const deltas = collapseDuplicateDeltas(rawDeltas);
  const fields: ParseCoreFields = {};
  const feeIdx = lastNegativeIndex(deltas);
  const used = new Set<number>();
  if (feeIdx >= 0) {
    const abs = Math.abs(deltas[feeIdx]!);
    if (isValidWzFee(abs)) {
      fields.fee = abs;
      used.add(feeIdx);
    }
  }

  const body: { n: number; i: number }[] = [];
  for (let i = 0; i < deltas.length; i++) {
    if (used.has(i)) continue;
    body.push({ n: deltas[i]!, i });
  }
  if (!body.length) return fields;

  fields.net = Math.trunc(body[0]!.n);
  const after = body.slice(1);
  const placeHit = after.find((item) => isValidPlacementSr(Math.abs(item.n)));
  const rest = placeHit ? after.filter((item) => item.i !== placeHit.i) : after;
  if (placeHit) fields.placementSr = Math.abs(placeHit.n);
  if (rest[0]) {
    if (rest.length >= 2) {
      fields.yourElimSr = Math.abs(rest[0].n);
      fields.squadElimSr = Math.abs(rest[1]!.n);
      fields.elimSr = fields.yourElimSr + fields.squadElimSr;
    } else {
      fields.elimSr = Math.abs(rest[0].n);
    }
  }
  return fields;
}

/** WZ overlay lists personal SR, then squad SR — the header is their sum. */
function finalizeOverlayElims(fields: ParseCoreFields): void {
  if (fields.yourElimSr != null) return;
  if (fields.elimSr == null || fields.squadElimSr == null) return;
  fields.yourElimSr = fields.elimSr;
  fields.elimSr = fields.yourElimSr + fields.squadElimSr;
}

function parseFromLabels(lines: string[]): ParseCoreFields {
  const fields: ParseCoreFields = {};
  const feeRaw = findFee(lines);
  const placementRaw = findPlacement(lines);
  let elimRaw = findNearLabel(lines, isElimLabel, "elim", pickLast);
  const totalRaw = findTotal(lines);
  const yourRaw = findNearLabel(lines, isYourElimLabel, "your", pickLast);
  let squadRaw = findNearLabel(lines, isSquadElimLabel, "squad", pickLast);

  for (const line of lines) {
    if (!isSquadElimLabel(line)) continue;
    const deltas = srDeltas(line);
    if (deltas.length >= 2) {
      if (elimRaw == null) elimRaw = deltas[0];
      squadRaw = deltas[deltas.length - 1];
    } else if (deltas.length === 1 && squadRaw == null) {
      squadRaw = deltas[0];
    }
  }

  if (feeRaw != null) fields.fee = absInt(feeRaw);
  if (placementRaw != null) fields.placementSr = absInt(placementRaw);
  if (elimRaw != null) fields.elimSr = absInt(elimRaw);
  if (totalRaw != null) fields.net = Math.trunc(totalRaw);
  if (yourRaw != null) fields.yourElimSr = absInt(yourRaw);
  if (squadRaw != null) fields.squadElimSr = absInt(squadRaw);
  return fields;
}

/** Extract core SR fields from Vision OCR full text. */
export function parseSrFieldsFromText(rawText: string): ParseCoreFields {
  const text = normalize(rawText);
  if (!text) return {};

  const lines = linesOf(rawText);
  const overlay = overlaySlice(lines);
  const fromLabels = parseFromLabels(overlay.length ? overlay : lines);
  const deltaSource = overlay.length ? overlay.join("\n") : rawText;
  const deltas = extractSignedSrDeltas(deltaSource);
  if (looksLikeWzOverlay(rawText, deltas) && deltas.length >= 3) {
    const fromSeq = fieldsFromOverlayDeltas(deltas);
    const merged: ParseCoreFields = { ...fromLabels, ...fromSeq };
    if (fromSeq.squadElimSr == null) delete merged.squadElimSr;
    if (fromSeq.yourElimSr == null) delete merged.yourElimSr;
    const labelFee = fromLabels.fee != null && isValidWzFee(fromLabels.fee) ? fromLabels.fee : undefined;
    const seqFee = fromSeq.fee != null && isValidWzFee(fromSeq.fee) ? fromSeq.fee : undefined;
    if (labelFee != null) merged.fee = labelFee;
    else if (seqFee != null) merged.fee = seqFee;
    else delete merged.fee;
    finalizeOverlayElims(merged);
    return merged;
  }
  return fromLabels;
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
