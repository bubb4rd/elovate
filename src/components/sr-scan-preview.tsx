"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDelta } from "@/lib/format";
import {
  canApplyBreakdown,
  placementIdFromSr,
  validateEditedBreakdown,
  type ParsedSrBreakdown,
} from "@/lib/ocr";
import { WZ_PLACEMENTS, type WzPlacementId } from "@/lib/ranked";
import { cn } from "@/lib/utils";

function asInt(value: string): number {
  return Math.trunc(Number(value) || 0);
}

export function SrScanPreview({
  initial,
  expectedFee,
  onApply,
  onRetry,
}: {
  initial: ParsedSrBreakdown;
  expectedFee?: number;
  onApply: (parsed: ParsedSrBreakdown) => void;
  onRetry: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [netInput, setNetInput] = useState(String(initial.net));
  const [placementSrInput, setPlacementSrInput] = useState(String(initial.placementSr));
  const [elimSrInput, setElimSrInput] = useState(String(initial.elimSr));
  const [feeInput, setFeeInput] = useState(String(initial.fee));
  const [placementOverride, setPlacementOverride] = useState<WzPlacementId | "">(
    initial.placementId ?? "",
  );

  const draft = useMemo(() => {
    const placementSr = asInt(placementSrInput);
    const base = validateEditedBreakdown(
      {
        net: asInt(netInput),
        placementSr,
        elimSr: asInt(elimSrInput),
        fee: asInt(feeInput),
        yourElimSr: initial.yourElimSr,
        squadElimSr: initial.squadElimSr,
      },
      { expectedFee },
    );
    if (placementOverride) {
      return {
        ...base,
        placementId: placementOverride,
        placementSr:
          WZ_PLACEMENTS.find((p) => p.id === placementOverride)?.placementSr ?? base.placementSr,
      };
    }
    return base;
  }, [
    netInput,
    placementSrInput,
    elimSrInput,
    feeInput,
    placementOverride,
    expectedFee,
    initial.yourElimSr,
    initial.squadElimSr,
  ]);

  const canApply = canApplyBreakdown(draft);
  const applyBlockedReason =
    draft.placementId == null
      ? "Select a valid placement before applying."
      : draft.elimSr > 150
        ? "Lower eliminations SR to 150 or below."
        : null;

  function syncPlacementFromSr(value: string) {
    setPlacementSrInput(value);
    const id = placementIdFromSr(asInt(value));
    setPlacementOverride(id ?? "");
  }

  return (
    <div className="space-y-4 rounded-[6px] border border-border bg-surface-elevated px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
          Scanned from screenshot
        </p>
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.16em]",
            draft.confidence === "high" && "text-accent",
            draft.confidence === "medium" && "text-muted",
            draft.confidence === "low" && "text-negative",
          )}
        >
          {draft.confidence} confidence
        </p>
      </div>

      {draft.warnings.length > 0 ? (
        <ul className="space-y-1 text-[11px] text-muted">
          {draft.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {editing ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted">Deployment fee</span>
            <Input
              type="number"
              inputMode="numeric"
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted">Placement SR</span>
            <Input
              type="number"
              inputMode="numeric"
              value={placementSrInput}
              onChange={(e) => syncPlacementFromSr(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted">Eliminations SR</span>
            <Input
              type="number"
              inputMode="numeric"
              value={elimSrInput}
              onChange={(e) => setElimSrInput(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted">Total (net)</span>
            <Input
              type="number"
              inputMode="numeric"
              value={netInput}
              onChange={(e) => setNetInput(e.target.value)}
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1.5">
            <span className="text-[11px] text-muted">Placement</span>
            <select
              value={placementOverride}
              onChange={(e) => {
                const id = e.target.value as WzPlacementId | "";
                setPlacementOverride(id);
                if (id) {
                  const sr = WZ_PLACEMENTS.find((p) => p.id === id)?.placementSr;
                  if (sr != null) setPlacementSrInput(String(sr));
                }
              }}
              className="h-10 w-full rounded-[6px] border border-border bg-background px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Placement bucket"
            >
              <option value="">Select placement…</option>
              {WZ_PLACEMENTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.placementSr} SR)
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <dl className="space-y-2">
          <PreviewRow label="Deployment fee" value={-draft.fee} tone="neg" />
          <PreviewRow label="Placement" value={draft.placementSr} />
          <PreviewRow label="Eliminations" value={draft.elimSr} />
          <div className="flex items-end justify-between gap-3 border-t border-dashed border-border pt-2.5">
            <dt className="text-xs font-medium text-foreground">Total</dt>
            <dd
              className={cn(
                "numeric text-2xl font-semibold leading-none tracking-tight",
                draft.net > 0 && "text-accent",
                draft.net < 0 && "text-negative",
                draft.net === 0 && "text-muted",
              )}
            >
              {formatDelta(draft.net)}
            </dd>
          </div>
        </dl>
      )}

      {applyBlockedReason ? (
        <p className="text-[11px] text-muted">{applyBlockedReason}</p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="w-full sm:flex-1"
          disabled={!canApply}
          onClick={() => onApply(draft)}
        >
          {canApply ? `Apply ${formatDelta(draft.net)} SR` : "Apply SR"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Done editing" : "Edit"}
        </Button>
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}

function PreviewRow({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: number;
  tone?: "plain" | "neg";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd
        className={cn(
          "numeric shrink-0 text-sm leading-none",
          tone === "neg" && "text-[#ff7a7a]",
          tone === "plain" && "text-foreground",
        )}
      >
        {formatDelta(value)}
      </dd>
    </div>
  );
}
