import { WZ_ELIM_CAP } from "@/lib/ranked";
import { isValidPlacementSr, placementIdFromSr } from "./placement-from-sr";
import type { OcrConfidence, ParsedSrBreakdown, ParseCoreFields } from "./types";
import { OcrHardFailure } from "./types";

const CORE_KEYS = ["net", "placementSr", "elimSr", "fee"] as const;

export function countCoreFields(fields: ParseCoreFields): number {
  return CORE_KEYS.filter((key) => fields[key] != null && Number.isFinite(fields[key])).length;
}

export function validateBreakdown(
  fields: ParseCoreFields,
  opts?: { expectedFee?: number | null },
): ParsedSrBreakdown {
  if (countCoreFields(fields) < 2) {
    throw new OcrHardFailure();
  }

  const warnings: string[] = [];
  const net = fields.net ?? 0;
  const placementSr = fields.placementSr ?? 0;
  const elimSr = fields.elimSr ?? 0;
  const fee = fields.fee ?? 0;

  if (fields.net == null) warnings.push("Match total was missing; filled with 0.");
  if (fields.placementSr == null) warnings.push("Placement SR was missing; filled with 0.");
  if (fields.elimSr == null) warnings.push("Eliminations SR was missing; filled with 0.");
  if (fields.fee == null) warnings.push("Deployment fee was missing; filled with 0.");

  const placementId = isValidPlacementSr(placementSr) ? placementIdFromSr(placementSr) : undefined;
  if (fields.placementSr != null && placementId == null) {
    warnings.push("Placement SR doesn’t match a known placement bucket.");
  }

  if (elimSr > WZ_ELIM_CAP) {
    warnings.push(`Eliminations SR is above the ${WZ_ELIM_CAP} cap.`);
  }

  const expectedNet = placementSr + elimSr - fee;
  if (
    fields.net != null &&
    fields.placementSr != null &&
    fields.elimSr != null &&
    fields.fee != null &&
    Math.abs(expectedNet - net) > 1
  ) {
    warnings.push("Breakdown doesn’t add up (placement + elims − fee ≠ total).");
  }

  if (
    opts?.expectedFee != null &&
    Number.isFinite(opts.expectedFee) &&
    fields.fee != null &&
    opts.expectedFee !== fee
  ) {
    warnings.push("Fee doesn’t match current SR.");
  }

  const present = countCoreFields(fields);
  let confidence: OcrConfidence = "high";
  if (present < 4 || warnings.length > 0) confidence = "medium";
  if (present < 3 || placementId == null || elimSr > WZ_ELIM_CAP) confidence = "low";
  if (confidence === "low" || confidence === "medium") {
    if (!warnings.some((w) => w.includes("Double-check"))) {
      warnings.unshift("Double-check these numbers.");
    }
  }

  const result: ParsedSrBreakdown = {
    net,
    placementSr,
    elimSr,
    fee,
    placementId,
    confidence,
    warnings,
  };
  if (fields.yourElimSr != null) result.yourElimSr = fields.yourElimSr;
  if (fields.squadElimSr != null) result.squadElimSr = fields.squadElimSr;
  return result;
}

/** Re-validate after the user edits confirm-preview fields. */
export function validateEditedBreakdown(
  edited: {
    net: number;
    placementSr: number;
    elimSr: number;
    fee: number;
    yourElimSr?: number;
    squadElimSr?: number;
  },
  opts?: { expectedFee?: number | null },
): ParsedSrBreakdown {
  return validateBreakdown(edited, opts);
}

export function canApplyBreakdown(parsed: ParsedSrBreakdown): boolean {
  if (parsed.placementId == null) return false;
  if (parsed.elimSr > WZ_ELIM_CAP) return false;
  return true;
}
