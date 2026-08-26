import { WZ_ELIM_CAP } from "@/lib/ranked";
import { isValidPlacementSr, placementIdFromSr } from "./placement-from-sr";
import type {
  OcrConfidence,
  ParsedSrBreakdown,
  ParseCoreFields,
  SrFieldIssue,
  SrFieldIssues,
  SrFieldKey,
} from "./types";
import { OcrHardFailure } from "./types";

const CORE_KEYS = ["net", "placementSr", "elimSr", "fee"] as const;
const UNREAD_BLOCKS_APPLY: readonly SrFieldKey[] = CORE_KEYS;

export function countCoreFields(fields: ParseCoreFields): number {
  return CORE_KEYS.filter((key) => fields[key] != null && Number.isFinite(fields[key])).length;
}

function present(value: number | undefined): value is number {
  return value != null && Number.isFinite(value);
}

export function validateBreakdown(
  fields: ParseCoreFields,
  opts?: { expectedFee?: number | null },
): ParsedSrBreakdown {
  if (countCoreFields(fields) < 2) {
    throw new OcrHardFailure();
  }

  const warnings: string[] = [];
  const fieldIssues: SrFieldIssues = {};
  const net = fields.net ?? 0;
  const placementSr = fields.placementSr ?? 0;
  const elimSr = fields.elimSr ?? 0;
  const fee = fields.fee ?? 0;

  if (!present(fields.net)) {
    warnings.push("Match total was missing; filled with 0.");
    fieldIssues.net = "unread";
  }
  if (!present(fields.placementSr)) {
    warnings.push("Placement SR was missing; filled with 0.");
    fieldIssues.placementSr = "unread";
  }
  if (!present(fields.elimSr)) {
    warnings.push("Eliminations SR was missing; filled with 0.");
    fieldIssues.elimSr = "unread";
  }
  if (!present(fields.fee)) {
    warnings.push("Deployment fee was missing; filled with 0.");
    fieldIssues.fee = "unread";
  }
  if (!present(fields.yourElimSr)) fieldIssues.yourElimSr = "unread";
  if (!present(fields.squadElimSr)) fieldIssues.squadElimSr = "unread";

  const placementId =
    present(fields.placementSr) && isValidPlacementSr(placementSr)
      ? placementIdFromSr(placementSr)
      : undefined;
  if (present(fields.placementSr) && placementId == null) {
    warnings.push("Placement SR doesn’t match a known placement bucket.");
    setIssue(fieldIssues, "placementSr", "unknown_bucket");
  }

  if (elimSr > WZ_ELIM_CAP) {
    warnings.push(`Eliminations SR is above the ${WZ_ELIM_CAP} cap.`);
    setIssue(fieldIssues, "elimSr", "over_cap");
  }

  const expectedNet = placementSr + elimSr - fee;
  if (
    present(fields.net) &&
    present(fields.placementSr) &&
    present(fields.elimSr) &&
    present(fields.fee) &&
    Math.abs(expectedNet - net) > 1
  ) {
    warnings.push("Breakdown doesn’t add up (placement + elims − fee ≠ total).");
    setIssue(fieldIssues, "net", "math_mismatch");
  }

  if (
    opts?.expectedFee != null &&
    Number.isFinite(opts.expectedFee) &&
    present(fields.fee) &&
    opts.expectedFee !== fee
  ) {
    warnings.push("Fee doesn’t match current SR.");
    setIssue(fieldIssues, "fee", "fee_mismatch");
  }

  const presentCount = countCoreFields(fields);
  let confidence: OcrConfidence = "high";
  if (presentCount < 4 || warnings.length > 0) confidence = "medium";
  if (presentCount < 3 || placementId == null || elimSr > WZ_ELIM_CAP) confidence = "low";
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
    fieldIssues,
  };
  if (present(fields.yourElimSr)) result.yourElimSr = fields.yourElimSr;
  if (present(fields.squadElimSr)) result.squadElimSr = fields.squadElimSr;
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
  opts?: { expectedFee?: number | null; unreadFields?: readonly SrFieldKey[] },
): ParsedSrBreakdown {
  const fields: ParseCoreFields = { ...edited };
  for (const key of opts?.unreadFields ?? []) {
    delete fields[key];
  }
  return validateBreakdown(fields, { expectedFee: opts?.expectedFee });
}

export function canApplyBreakdown(parsed: ParsedSrBreakdown): boolean {
  for (const key of UNREAD_BLOCKS_APPLY) {
    if (parsed.fieldIssues[key] === "unread") return false;
  }
  if (parsed.placementId == null) return false;
  if (parsed.elimSr > WZ_ELIM_CAP) return false;
  return true;
}

function setIssue(issues: SrFieldIssues, key: SrFieldKey, issue: SrFieldIssue) {
  if (issues[key] === "unread") return;
  issues[key] = issue;
}
