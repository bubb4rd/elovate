import type { WzPlacementId } from "@/lib/ranked";

export type OcrConfidence = "high" | "medium" | "low";

export type SrFieldKey =
  | "fee"
  | "placementSr"
  | "elimSr"
  | "yourElimSr"
  | "squadElimSr"
  | "net";

export type SrFieldIssue =
  | "unread"
  | "unknown_bucket"
  | "over_cap"
  | "math_mismatch"
  | "fee_mismatch";

export type SrFieldIssues = Partial<Record<SrFieldKey, SrFieldIssue>>;

export type ParsedSrBreakdown = {
  net: number;
  placementSr: number;
  elimSr: number;
  fee: number;
  yourElimSr?: number;
  squadElimSr?: number;
  placementId?: WzPlacementId;
  confidence: OcrConfidence;
  warnings: string[];
  fieldIssues: SrFieldIssues;
};

export type ParseCoreFields = {
  net?: number;
  placementSr?: number;
  elimSr?: number;
  fee?: number;
  yourElimSr?: number;
  squadElimSr?: number;
};

export class OcrHardFailure extends Error {
  readonly code = "UNREADABLE_SR" as const;

  constructor(message = "Couldn’t find an SR breakdown in this image") {
    super(message);
    this.name = "OcrHardFailure";
  }
}
