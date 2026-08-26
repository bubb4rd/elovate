"use client";

import { Camera, CheckCircle, Warning } from "@phosphor-icons/react";
import { useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDelta } from "@/lib/format";
import {
  canApplyBreakdown,
  validateEditedBreakdown,
  type ParsedSrBreakdown,
  type SrFieldIssue,
  type SrFieldKey,
} from "@/lib/ocr";
import { WZ_ELIM_CAP, WZ_PLACEMENT_MAX, WZ_PLACEMENTS, type WzPlacementId } from "@/lib/ranked";
import { cn } from "@/lib/utils";

function asInt(value: string): number {
  return Math.trunc(Number(value) || 0);
}

function unreadKeysFrom(initial: ParsedSrBreakdown): SrFieldKey[] {
  return (Object.entries(initial.fieldIssues) as [SrFieldKey, SrFieldIssue][])
    .filter(([, issue]) => issue === "unread")
    .map(([key]) => key);
}

function issueLabel(issue: SrFieldIssue): string {
  switch (issue) {
    case "unread":
      return "Couldn’t read this value";
    case "unknown_bucket":
      return "Doesn’t match a known placement";
    case "over_cap":
      return `Above the ${WZ_ELIM_CAP} cap`;
    case "math_mismatch":
      return "Doesn’t add up";
    case "fee_mismatch":
      return "Doesn’t match current SR";
  }
}

const GOLD_TEXT =
  "accent-glow bg-linear-to-r from-[#fcf8c5] via-[#f2c81d] to-[#ca8d0b] bg-clip-text text-transparent";
const CRIMSON_TEXT =
  "bg-linear-to-r from-[#ff7375] via-[#f21d21] to-[#ca0b0e] bg-clip-text text-transparent";

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
  const originalUnread = useMemo(() => unreadKeysFrom(initial), [initial]);
  const [confirmed, setConfirmed] = useState<SrFieldKey[]>([]);
  const [editing, setEditing] = useState<SrFieldKey | null>(null);

  const [netInput, setNetInput] = useState(
    initial.fieldIssues.net === "unread" ? "" : String(initial.net),
  );
  const [placementSrInput, setPlacementSrInput] = useState(
    initial.fieldIssues.placementSr === "unread" ? "" : String(initial.placementSr),
  );
  const [elimSrInput, setElimSrInput] = useState(
    initial.fieldIssues.elimSr === "unread" ? "" : String(initial.elimSr),
  );
  const [feeInput, setFeeInput] = useState(
    initial.fieldIssues.fee === "unread" ? "" : String(initial.fee),
  );
  const [yourElimInput, setYourElimInput] = useState(
    initial.fieldIssues.yourElimSr === "unread" ? "" : String(initial.yourElimSr ?? ""),
  );
  const [squadElimInput, setSquadElimInput] = useState(
    initial.fieldIssues.squadElimSr === "unread" ? "" : String(initial.squadElimSr ?? ""),
  );
  const [placementOverride, setPlacementOverride] = useState<WzPlacementId | "">(
    initial.fieldIssues.placementSr === "unread" ? "" : (initial.placementId ?? ""),
  );
  const editBackup = useRef<{
    net: string;
    placementSr: string;
    elimSr: string;
    fee: string;
    yourElim: string;
    squadElim: string;
    placementOverride: WzPlacementId | "";
  } | null>(null);

  function beginEdit(key: SrFieldKey) {
    editBackup.current = {
      net: netInput,
      placementSr: placementSrInput,
      elimSr: elimSrInput,
      fee: feeInput,
      yourElim: yourElimInput,
      squadElim: squadElimInput,
      placementOverride,
    };
    setEditing(key);
  }

  const unreadFields = useMemo(
    () => originalUnread.filter((key) => !confirmed.includes(key)),
    [originalUnread, confirmed],
  );

  const draft = useMemo(() => {
    const placementSr = asInt(placementSrInput);
    const base = validateEditedBreakdown(
      {
        net: asInt(netInput),
        placementSr,
        elimSr: asInt(elimSrInput),
        fee: asInt(feeInput),
        yourElimSr: yourElimInput.trim() === "" ? undefined : asInt(yourElimInput),
        squadElimSr: squadElimInput.trim() === "" ? undefined : asInt(squadElimInput),
      },
      { expectedFee, unreadFields },
    );
    if (placementOverride && !unreadFields.includes("placementSr")) {
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
    yourElimInput,
    squadElimInput,
    placementOverride,
    expectedFee,
    unreadFields,
  ]);

  const canApply = canApplyBreakdown(draft);
  const scanClean = Object.keys(draft.fieldIssues).length === 0;
  const maxWin =
    draft.fieldIssues.placementSr == null &&
    draft.fieldIssues.elimSr == null &&
    draft.placementSr >= WZ_PLACEMENT_MAX &&
    draft.elimSr >= WZ_ELIM_CAP;
  const applyBlockedReason = !canApply
    ? unreadFields.some((key) => key === "fee" || key === "placementSr" || key === "elimSr" || key === "net")
      ? "Fix unread fields before applying."
      : draft.placementId == null
        ? "Select a valid placement before applying."
        : draft.elimSr > WZ_ELIM_CAP
          ? `Lower eliminations SR to ${WZ_ELIM_CAP} or below.`
          : null
    : null;

  function confirm(key: SrFieldKey) {
    if (key === "placementSr") {
      if (!placementOverride) return;
      const sr = WZ_PLACEMENTS.find((p) => p.id === placementOverride)?.placementSr;
      if (sr != null) setPlacementSrInput(String(sr));
    } else {
      const raw = inputValue(key);
      if (raw.trim() === "") return;
    }
    setConfirmed((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setEditing(null);
  }

  function inputValue(key: SrFieldKey): string {
    switch (key) {
      case "net":
        return netInput;
      case "placementSr":
        return placementSrInput;
      case "elimSr":
        return elimSrInput;
      case "fee":
        return feeInput;
      case "yourElimSr":
        return yourElimInput;
      case "squadElimSr":
        return squadElimInput;
    }
  }

  function restoreField() {
    const snap = editBackup.current;
    if (!snap) return;
    setNetInput(snap.net);
    setPlacementSrInput(snap.placementSr);
    setElimSrInput(snap.elimSr);
    setFeeInput(snap.fee);
    setYourElimInput(snap.yourElim);
    setSquadElimInput(snap.squadElim);
    setPlacementOverride(snap.placementOverride);
  }

  function onEditorKeyDown(event: KeyboardEvent, key: SrFieldKey) {
    if (event.key === "Enter") {
      event.preventDefault();
      confirm(key);
    }
    if (event.key === "Escape") {
      event.preventDefault();
      restoreField();
      setEditing(null);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[6px] border border-border bg-surface-elevated">
      <GoldScanDef />
      <div className="px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <Camera className="size-5 shrink-0" weight="regular" aria-hidden />
            Screenshot Scan
          </p>
          {scanClean ? (
            <CheckCircle
              weight="fill"
              className="size-[26px] accent-glow [&_path]:fill-[url(#sr-scan-gold)]"
              aria-label="Scan looks complete"
            />
          ) : (
            <span className="sr-only">Some fields need a review</span>
          )}
        </div>

        <dl className="mt-5 space-y-3">
          <ScanRow
            label="Deployment fee"
            issue={draft.fieldIssues.fee}
            editing={editing === "fee"}
            onEdit={() => beginEdit("fee")}
            editor={
              <NumberEditor
                label="Deployment fee"
                value={feeInput}
                onChange={setFeeInput}
                onConfirm={() => confirm("fee")}
                onKeyDown={(event) => onEditorKeyDown(event, "fee")}
              />
            }
          >
            {draft.fieldIssues.fee === "unread" ? (
              <UnreadValue />
            ) : (
              <SrAmount value={-draft.fee} tone="crimson" />
            )}
          </ScanRow>

          <ScanRow
            label="Placement fee"
            issue={draft.fieldIssues.placementSr}
            editing={editing === "placementSr"}
            onEdit={() => beginEdit("placementSr")}
            editor={
              <PlacementEditor
                value={placementOverride}
                onChange={(id) => {
                  setPlacementOverride(id);
                  if (id) {
                    const sr = WZ_PLACEMENTS.find((p) => p.id === id)?.placementSr;
                    if (sr != null) setPlacementSrInput(String(sr));
                  }
                }}
                onConfirm={() => confirm("placementSr")}
                onKeyDown={(event) => onEditorKeyDown(event, "placementSr")}
              />
            }
          >
            {draft.fieldIssues.placementSr === "unread" ? (
              <UnreadValue />
            ) : (
              <SrAmount
                value={draft.placementSr}
                tone={
                  draft.fieldIssues.placementSr == null && draft.placementSr >= WZ_PLACEMENT_MAX
                    ? "gold"
                    : "plain"
                }
              />
            )}
          </ScanRow>

          <ScanRow
            label="Eliminations"
            issue={draft.fieldIssues.elimSr}
            editing={editing === "elimSr"}
            onEdit={() => beginEdit("elimSr")}
            editor={
              <NumberEditor
                label="Eliminations SR"
                value={elimSrInput}
                onChange={setElimSrInput}
                onConfirm={() => confirm("elimSr")}
                onKeyDown={(event) => onEditorKeyDown(event, "elimSr")}
              />
            }
          >
            {draft.fieldIssues.elimSr === "unread" ? (
              <UnreadValue />
            ) : (
              <SrAmount
                value={draft.elimSr}
                tone={
                  draft.fieldIssues.elimSr == null && draft.elimSr >= WZ_ELIM_CAP ? "gold" : "plain"
                }
              />
            )}
          </ScanRow>

          <div className="relative space-y-2.5 pl-3">
            <span aria-hidden className="absolute top-0.5 bottom-0.5 left-0 w-px bg-border" />
            <ScanRow
              label="Personal"
              nested
              issue={draft.fieldIssues.yourElimSr}
              editing={editing === "yourElimSr"}
              onEdit={() => beginEdit("yourElimSr")}
              editor={
                <NumberEditor
                  label="Personal eliminations SR"
                  value={yourElimInput}
                  onChange={setYourElimInput}
                  onConfirm={() => confirm("yourElimSr")}
                  onKeyDown={(event) => onEditorKeyDown(event, "yourElimSr")}
                />
              }
            >
              {draft.fieldIssues.yourElimSr === "unread" ? (
                <UnreadValue nested />
              ) : (
                <SrAmount value={draft.yourElimSr ?? 0} tone="plain" size="nested" />
              )}
            </ScanRow>
            <ScanRow
              label="Squad"
              nested
              issue={draft.fieldIssues.squadElimSr}
              editing={editing === "squadElimSr"}
              onEdit={() => beginEdit("squadElimSr")}
              editor={
                <NumberEditor
                  label="Squad eliminations SR"
                  value={squadElimInput}
                  onChange={setSquadElimInput}
                  onConfirm={() => confirm("squadElimSr")}
                  onKeyDown={(event) => onEditorKeyDown(event, "squadElimSr")}
                />
              }
            >
              {draft.fieldIssues.squadElimSr === "unread" ? (
                <UnreadValue nested />
              ) : (
                <SrAmount value={draft.squadElimSr ?? 0} tone="plain" size="nested" />
              )}
            </ScanRow>
          </div>

          <ScanRow
            label="Match total"
            total
            issue={draft.fieldIssues.net}
            editing={editing === "net"}
            onEdit={() => beginEdit("net")}
            editor={
              <NumberEditor
                label="Match total"
                value={netInput}
                onChange={setNetInput}
                onConfirm={() => confirm("net")}
                onKeyDown={(event) => onEditorKeyDown(event, "net")}
              />
            }
          >
            {draft.fieldIssues.net === "unread" ? (
              <UnreadValue />
            ) : (
              <SrAmount
                value={draft.net}
                size="total"
                tone={
                  maxWin
                    ? "gold"
                    : draft.net > 0
                      ? "accent"
                      : draft.net < 0
                        ? "negative"
                        : "muted"
                }
              />
            )}
          </ScanRow>
        </dl>
      </div>

      {applyBlockedReason ? (
        <p className="border-t border-border px-4 py-2.5 text-[12px] text-muted sm:px-5">
          {applyBlockedReason}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:px-5">
        <Button
          type="button"
          className="w-full sm:flex-1"
          disabled={!canApply}
          onClick={() => onApply(draft)}
        >
          {canApply ? `Apply ${formatDelta(draft.net)} SR` : "Apply SR"}
        </Button>
        <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}

function ScanRow({
  label,
  issue,
  editing,
  onEdit,
  editor,
  children,
  nested = false,
  total = false,
}: {
  label: string;
  issue?: SrFieldIssue;
  editing: boolean;
  onEdit: () => void;
  editor: ReactNode;
  children: React.ReactNode;
  nested?: boolean;
  total?: boolean;
}) {
  const flagged = issue != null;
  return (
    <div
      className={cn(
        total && "border-t border-dashed border-border pt-3",
        editing && "rounded-[6px] bg-background/50 p-2.5 sm:p-0 sm:bg-transparent",
      )}
    >
      <div
        className={cn(
          "flex gap-3",
          editing ? "flex-col sm:flex-row sm:items-center sm:justify-between" : "items-center justify-between",
        )}
      >
        <dt className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "text-foreground",
              nested ? "text-[13px] text-muted" : "text-base font-medium",
              total && "text-sm",
            )}
          >
            {label}
          </span>
          {flagged ? (
            <Warning
              weight="fill"
              className="size-4 shrink-0 text-warning"
              aria-label={issueLabel(issue)}
              title={issueLabel(issue)}
            />
          ) : null}
          {!editing ? (
            <button
              type="button"
              onClick={onEdit}
              className={cn(
                "shrink-0 text-[11px] font-medium underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                flagged ? "text-warning" : "text-muted",
              )}
            >
              Edit
            </button>
          ) : null}
        </dt>
        <dd className={cn("min-w-0", editing ? "w-full sm:w-auto sm:max-w-[16rem]" : "shrink-0")}>
          {editing ? editor : children}
        </dd>
      </div>
      {flagged && !editing ? (
        <p className="mt-1 text-[11px] text-warning">{issueLabel(issue)}</p>
      ) : null}
    </div>
  );
}

function NumberEditor({
  label,
  value,
  onChange,
  onConfirm,
  onKeyDown,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="numeric"
        aria-label={label}
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        className="h-9"
      />
      <Button type="button" size="sm" variant="outline" onClick={onConfirm}>
        Done
      </Button>
    </div>
  );
}

function PlacementEditor({
  value,
  onChange,
  onConfirm,
  onKeyDown,
}: {
  value: WzPlacementId | "";
  onChange: (value: WzPlacementId | "") => void;
  onConfirm: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        aria-label="Placement"
        autoFocus
        onChange={(event) => onChange(event.target.value as WzPlacementId | "")}
        onKeyDown={onKeyDown}
        className="h-9 w-full rounded-[6px] border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <option value="">Select placement…</option>
        {WZ_PLACEMENTS.map((placement) => (
          <option key={placement.id} value={placement.id}>
            {placement.label} ({placement.placementSr} SR)
          </option>
        ))}
      </select>
      <Button type="button" size="sm" variant="outline" onClick={onConfirm} disabled={!value}>
        Done
      </Button>
    </div>
  );
}

function UnreadValue({ nested = false }: { nested?: boolean }) {
  return (
    <span className={cn("numeric text-muted", nested ? "text-[13px]" : "text-base")}>Unread</span>
  );
}

function SrAmount({
  value,
  tone,
  size = "row",
}: {
  value: number;
  tone: "gold" | "crimson" | "plain" | "accent" | "negative" | "muted";
  size?: "row" | "nested" | "total";
}) {
  const numClass = size === "total" ? "text-2xl" : size === "nested" ? "text-[15px]" : "text-xl";
  const srClass = size === "total" ? "text-sm" : size === "nested" ? "text-[11px]" : "text-[13px]";
  const color =
    tone === "gold"
      ? GOLD_TEXT
      : tone === "crimson"
        ? CRIMSON_TEXT
        : tone === "accent"
          ? "accent-glow text-accent"
          : tone === "negative"
            ? "text-negative"
            : tone === "muted"
              ? "text-muted"
              : "text-foreground";

  return (
    <span className={cn("numeric inline-flex items-baseline gap-0.5 leading-none tracking-tight", color)}>
      <span className={numClass}>{formatDelta(value)}</span>
      <span className={cn("font-bold", srClass)}>SR</span>
    </span>
  );
}

function GoldScanDef() {
  return (
    <svg aria-hidden className="absolute size-0 overflow-hidden">
      <defs>
        <linearGradient id="sr-scan-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fcf8c5" />
          <stop offset="45%" stopColor="#f2c81d" />
          <stop offset="100%" stopColor="#ca8d0b" />
        </linearGradient>
      </defs>
    </svg>
  );
}
