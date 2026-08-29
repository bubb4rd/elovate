"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RankPlate } from "@/components/rank-plate";
import { RankTimeline } from "@/components/rank-timeline";
import { SessionPanel } from "@/components/session-panel";
import { MatchSubmitReceipt } from "@/components/match-submit-receipt";
import { SaveClimbCta } from "@/components/save-climb-cta";
import { SrInputMode, type EntryMode } from "@/components/sr-input-mode";
import { SrScanPreview } from "@/components/sr-scan-preview";
import { SrScreenshotUpload } from "@/components/sr-screenshot-upload";
import { SrTicket } from "@/components/sr-ticket";
import { TeammatePicker, type TeammateViewer } from "@/components/teammate-picker";
import { TickerNumeral } from "@/components/ticker-numeral";
import { formatDelta, formatSr } from "@/lib/format";
import { reverseElimKills, type ParsedSrBreakdown } from "@/lib/ocr";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SR_PER_LOSS,
  DEFAULT_SR_PER_WIN,
  RESULT_PRESETS,
  WZ_ELIM_CAP,
  WZ_PLACEMENTS,
  clampSr,
  boardRankLabel,
  estimatedBoardRank,
  mpGamesToTarget,
  nextBoardTarget,
  rankFromSr,
  rankThresholds,
  resolveTarget,
  elimSrBreakdown,
  squadElimBaseline,
  wzGamesToTarget,
  wzNetSr,
  type BoardRung,
  type ClimbTarget,
  type RankDelta,
  type WzPlacementId,
} from "@/lib/ranked";
import type { Mode } from "@/lib/data/types";
import {
  ensureCalcSeeded,
  parseStoredCalc,
  readCalcRaw,
  subscribeCalc,
  writeCalcStored,
  type StoredCalc as StoredCalcBase,
} from "@/lib/history/calc-storage";
import {
  appendMatch,
  deleteSession,
  endSession,
  openSession,
  retractMatchInvites,
  setMatchTeammates,
  syncMatchInvites,
  undoLastMatch,
  type HistoryDocument,
  type HistoryTeammate,
  type NewMatch,
} from "@/lib/history";
import { useHistory } from "@/lib/history/use-history";

const TARGETS: { id: ClimbTarget; label: string }[] = [
  { id: "nextTier", label: "Next tier" },
  { id: "nextDivision", label: "Next rank" },
  { id: "iridescent", label: "Iridescent" },
  { id: "top250", label: "Live T250" },
];

type StoredCalc = Omit<StoredCalcBase, "target" | "placement"> & {
  target?: ClimbTarget;
  placement?: WzPlacementId | null;
};

function getServerSnapshot() {
  return "";
}

function asRankDelta(value: number | undefined): RankDelta {
  if (value == null || value < -3 || value > 3) return 0;
  return Math.round(value) as RankDelta;
}

function asTarget(value: ClimbTarget | string | undefined): ClimbTarget {
  return TARGETS.find((item) => item.id === value)?.id ?? "nextTier";
}

function asPlacement(value: WzPlacementId | null | undefined): WzPlacementId | null {
  if (value == null) return null;
  if (WZ_PLACEMENTS.some((item) => item.id === value)) return value;
  return null;
}

const COMMON_SQUAD_ELIMS = [5, 10, 15, 20, 25] as const;
const COMMON_YOUR_ELIMS = [0, 2, 5, 8, 10] as const;

function readSquadElims(stored: StoredCalc): { value: number; input: string } {
  if (stored.squadElimsInput != null || stored.squadElims != null) {
    const input = stored.squadElimsInput ?? String(stored.squadElims);
    return { input, value: Math.max(0, Math.floor(Number(input) || 0)) };
  }
  if (stored.elimsInput != null || stored.elims != null) {
    const input = stored.elimsInput ?? String(stored.elims);
    return { input, value: Math.max(0, Math.floor(Number(input) || 0)) };
  }
  return { input: "", value: 0 };
}

function readYourElims(stored: StoredCalc): { value: number; input: string } {
  if (stored.yourElimsInput != null || stored.yourElims != null) {
    const input = stored.yourElimsInput ?? String(stored.yourElims);
    return { input, value: Math.max(0, Math.floor(Number(input) || 0)) };
  }
  if (stored.elims != null || stored.elimsInput != null) {
    const legacy = Math.max(0, Math.floor(Number(stored.elimsInput ?? stored.elims) || 0));
    return { input: String(legacy), value: legacy };
  }
  return { input: "", value: 0 };
}

export function SrCalculator({
  mode,
  cutoffSr,
  ladder,
  signedIn = false,
  viewer = null,
  profileSr = null,
}: {
  mode: Mode;
  cutoffSr: number;
  ladder: BoardRung[];
  signedIn?: boolean;
  viewer?: TeammateViewer | null;
  profileSr?: number | null;
}) {
  const userId = viewer?.id ?? null;
  const subscribe = useCallback(
    (onChange: () => void) => subscribeCalc(mode, userId, onChange),
    [mode, userId],
  );
  const getSnapshot = useCallback(() => readCalcRaw(mode, userId), [mode, userId]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const stored = parseStoredCalc(raw) as StoredCalc;

  useEffect(() => {
    if (!userId || profileSr == null) return;
    ensureCalcSeeded(mode, userId, profileSr);
  }, [mode, userId, profileSr]);

  useEffect(() => {
    setPendingMatchId(null);
    setSubmitReceipt(null);
    setShowAuthCta(false);
    setOcrResult(null);
  }, [userId]);

  const srInput = stored.srInput ?? (stored.sr != null ? String(stored.sr) : "0");
  const squadElimsState = readSquadElims(stored);
  const squadElimsInput = squadElimsState.input;
  const squadElims = squadElimsState.value;
  const yourElimsState = readYourElims(stored);
  const yourElimsInput = yourElimsState.input;
  const yourElims = yourElimsState.value;
  const srPerWinInput =
    stored.srPerWinInput ?? (stored.srPerWin != null ? String(stored.srPerWin) : String(DEFAULT_SR_PER_WIN));
  const srPerLossInput =
    stored.srPerLossInput ??
    (stored.srPerLoss != null ? String(stored.srPerLoss) : String(DEFAULT_SR_PER_LOSS));
  const rankDelta = asRankDelta(stored.rankDelta);
  const target = asTarget(stored.target);
  const placementId = asPlacement(stored.placement as WzPlacementId | null | undefined);

  const [editingSr, setEditingSr] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>("manual");
  const [ocrResult, setOcrResult] = useState<ParsedSrBreakdown | null>(null);
  const [historySaveFailed, setHistorySaveFailed] = useState(false);
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const [submitReceipt, setSubmitReceipt] = useState<"success" | "error" | null>(null);
  const [showAuthCta, setShowAuthCta] = useState(false);
  const rankCardRef = useRef<HTMLDivElement>(null);
  const [rankCardHeight, setRankCardHeight] = useState<number | undefined>();
  const { doc: historyDoc, store: historyStore, cloudSyncFailed, retrySync } = useHistory(mode);
  useLayoutEffect(() => {
    const el = rankCardRef.current;
    if (!el) return;
    const update = () => {
      setRankCardHeight(el.getBoundingClientRect().height);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const sr = clampSr(Number(srInput) || 0);
  const yourElimsClamped = Math.min(yourElims, squadElims);
  const srPerWin = Math.max(0, Math.floor(Number(srPerWinInput) || 0));
  const srPerLoss = Math.max(0, Math.floor(Number(srPerLossInput) || 0));

  function patch(next: Partial<StoredCalc>) {
    writeCalcStored(mode, userId, {
      ...stored,
      sr,
      squadElims,
      yourElims: yourElimsClamped,
      srPerWin,
      srPerLoss,
      rankDelta,
      target,
      placement: placementId,
      srInput,
      squadElimsInput,
      yourElimsInput,
      srPerWinInput,
      srPerLossInput,
      ...next,
    });
  }

  function startNextGame(next: Partial<StoredCalc>) {
    setPendingMatchId(null);
    setSubmitReceipt(null);
    setShowAuthCta(false);
    patch(next);
  }

  const rank = rankFromSr(sr, cutoffSr);
  const liveRank = estimatedBoardRank(sr, ladder);
  const boardLabel = liveRank != null ? `#${liveRank}` : null;
  const displayRank =
    boardLabel == null
      ? rank
      : { ...rank, divisionLabel: boardLabel, label: boardLabel };
  const boardTarget = nextBoardTarget(sr, ladder);
  const resolved = boardTarget
    ? { sr: boardTarget.sr, label: boardTarget.label, reached: boardTarget.reached }
    : resolveTarget(sr, target, cutoffSr);
  const climbOptions = boardTarget
    ? [{ id: `board:${boardTarget.rank}`, label: boardTarget.label }]
    : TARGETS;
  const climbValue = boardTarget ? `board:${boardTarget.rank}` : target;
  const remaining = Math.max(0, resolved.sr - sr);
  const rankOptions = rankThresholds(cutoffSr);
  const selectedPlacement = placementId
    ? (WZ_PLACEMENTS.find((p) => p.id === placementId) ?? null)
    : null;

  const wzScenarios = WZ_PLACEMENTS.map((placement) => {
    const result = wzGamesToTarget({
      currentSr: sr,
      targetSr: resolved.sr,
      placement,
      squadElims,
      yourElims: yourElimsClamped,
      rankDelta,
      cutoffSr,
    });
    return { placement, ...result };
  });

  const mpResult = mpGamesToTarget({
    currentSr: sr,
    targetSr: resolved.sr,
    srPerWin,
  });

  const selectedWz = placementId
    ? (wzScenarios.find((s) => s.placement.id === placementId) ?? null)
    : null;
  const headlineNet = mode === "wz" ? (selectedWz?.net ?? 0) : mpResult.net;
  const headlineGames = mode === "wz" ? (selectedWz?.games ?? null) : mpResult.games;
  const projectedSr =
    headlineGames == null
      ? Math.max(0, sr + headlineNet)
      : Math.max(0, sr + headlineGames * headlineNet);
  const canCancel =
    mode === "wz"
      ? squadElimsInput.trim() !== "" ||
        yourElimsInput.trim() !== "" ||
        placementId != null
      : srPerWinInput.trim() !== "";

  const hasElimInputs =
    mode === "wz" &&
    (squadElimsInput.trim() !== "" || yourElimsInput.trim() !== "" || squadElims > 0 || yourElimsClamped > 0);
  const progressivePreview = mode === "wz" && !hasElimInputs && placementId == null;
  const canApplyWz = placementId != null && headlineNet !== 0;
  const canApply = mode === "wz" ? canApplyWz : headlineNet !== 0;

  const applyBarState = hydrated
    ? {
        net: headlineNet,
        canCancel,
        canApply,
        selected: placementId != null,
        progressive: progressivePreview,
      }
    : mode === "wz"
      ? {
          net: 0,
          canCancel: false,
          canApply: false,
          selected: false,
          progressive: true,
        }
      : {
          net: 0,
          canCancel: false,
          canApply: false,
          selected: false,
          progressive: false,
        };

  function clearedGame(): Partial<StoredCalc> {
    if (mode === "wz") {
      return {
        squadElims: 0,
        squadElimsInput: "",
        yourElims: 0,
        yourElimsInput: "",
        placement: null,
      };
    }
    return { srPerWin: 0, srPerWinInput: "" };
  }

  const elimParts = elimSrBreakdown(squadElims, yourElimsClamped);
  const placementSr = selectedPlacement?.placementSr ?? 0;
  const ticketNet = placementSr + elimParts.elimSr - rank.fee;

  function addSr() {
    if (headlineNet === 0) return;
    const next = clampSr(sr + headlineNet);
    const appliedNet = next - sr;
    if (appliedNet === 0) return;

    let recorded = true;
    try {
      let draft: NewMatch;
      if (mode === "wz") {
        if (placementId == null) return;
        draft = {
          mode: "wz",
          srBefore: sr,
          srAfter: next,
          net: appliedNet,
          placement: placementId,
          squadElims,
          yourElims: yourElimsClamped,
          fee: rank.fee,
          placementSr,
          elimSr: elimParts.elimSr,
          capped: elimParts.capped,
        };
      } else {
        draft = {
          mode: "mp",
          srBefore: sr,
          srAfter: next,
          net: appliedNet,
          srPerWin,
        };
      }
      const result = appendMatch(historyStore.load(), draft);
      recorded = historyStore.save(result.doc);
      if (recorded) {
        setSubmitReceipt(null);
        setPendingMatchId(result.match.id);
        if (!signedIn) setShowAuthCta(true);
      }
    } catch {
      recorded = false;
    }
    setHistorySaveFailed(!recorded);
    patch({ sr: next, srInput: String(next), ...clearedGame() });
  }

  function cancel() {
    if (!canCancel) return;
    patch(clearedGame());
  }

  function setEntryModeSafe(next: EntryMode) {
    if (next === "photo") {
      setPendingMatchId(null);
      setSubmitReceipt(null);
      setShowAuthCta(false);
    }
    setEntryMode(next);
    if (next === "manual") setOcrResult(null);
  }

  function applyOcrMatch(parsed: ParsedSrBreakdown) {
    if (parsed.placementId == null) return;
    if (parsed.elimSr > WZ_ELIM_CAP) return;

    const next = clampSr(sr + parsed.net);
    const appliedNet = next - sr;

    const kills = reverseElimKills({
      yourElimSr: parsed.yourElimSr,
      squadElimSr: parsed.squadElimSr,
    });
    const yourElims = Math.min(kills.yourElims, Math.max(kills.squadElims, kills.yourElims));

    let recorded = true;
    try {
      const draft: NewMatch = {
        mode: "wz",
        srBefore: sr,
        srAfter: next,
        net: appliedNet,
        placement: parsed.placementId,
        squadElims: kills.squadElims,
        yourElims,
        fee: parsed.fee,
        placementSr: parsed.placementSr,
        elimSr: parsed.elimSr,
        capped: parsed.elimSr >= WZ_ELIM_CAP,
      };
      const result = appendMatch(historyStore.load(), draft);
      recorded = historyStore.save(result.doc);
      if (recorded) {
        setSubmitReceipt(null);
        setPendingMatchId(result.match.id);
        if (!signedIn) setShowAuthCta(true);
      }
    } catch {
      recorded = false;
    }
    setHistorySaveFailed(!recorded);
    patch({ sr: next, srInput: String(next), ...clearedGame() });
    setOcrResult(null);
  }

  function patchSr(value: string) {
    patch({ srInput: value, sr: clampSr(Number(value) || 0) });
  }

  function undoLast() {
    const result = undoLastMatch(historyStore.load(), sr);
    if (!result) return;
    setPendingMatchId((current) => (current === result.removed.id ? null : current));
    setSubmitReceipt(null);
    setShowAuthCta(false);
    if (signedIn) void retractMatchInvites(result.removed.id);
    const ok = historyStore.save(result.doc);
    setHistorySaveFailed(!ok);
    patch({ sr: result.restoredSr, srInput: String(result.restoredSr) });
  }

  function savePendingTeammates(teammates: HistoryTeammate[]) {
    if (!pendingMatchId) return;
    const previous =
      historyStore.load().matches.find((match) => match.id === pendingMatchId)?.teammates ?? [];
    const ok = historyStore.save(
      setMatchTeammates(historyStore.load(), pendingMatchId, teammates),
    );
    setHistorySaveFailed(!ok);
    if (ok && signedIn) {
      void syncMatchInvites({
        mode,
        matchId: pendingMatchId,
        previous,
        next: teammates,
      }).then((invited) => {
        if (!invited) setHistorySaveFailed(true);
      });
    }
  }

  function finishTeammates() {
    if (pendingMatchId && signedIn) {
      const match = historyStore.load().matches.find((item) => item.id === pendingMatchId);
      if (match && match.teammates.length > 0) {
        void syncMatchInvites({
          mode,
          matchId: pendingMatchId,
          previous: [],
          next: match.teammates,
        });
      }
    }
    setPendingMatchId(null);
    setSubmitReceipt(historySaveFailed || cloudSyncFailed ? "error" : "success");
  }

  useEffect(() => {
    if (!signedIn || !pendingMatchId) return;
    const match = historyStore.load().matches.find((item) => item.id === pendingMatchId);
    if (!match || match.teammates.length === 0) return;
    void syncMatchInvites({
      mode,
      matchId: pendingMatchId,
      previous: [],
      next: match.teammates,
    });
  }, [signedIn, pendingMatchId, mode, historyStore]);

  function startNewSubmission() {
    setSubmitReceipt(null);
    setPendingMatchId(null);
  }

  function endOpenSession() {
    const open = openSession(historyDoc);
    if (!open) return;
    const ok = historyStore.save(endSession(historyDoc, open.id));
    setHistorySaveFailed(!ok);
  }

  function deletePastSession(sessionId: string) {
    const ok = historyStore.save(deleteSession(historyStore.load(), sessionId));
    setHistorySaveFailed(!ok);
  }

  const ticketOpen =
    hydrated &&
    mode === "wz" &&
    (placementId != null || squadElimsInput.trim() !== "" || yourElimsInput.trim() !== "");

  return (
    <div
      className={cn(
        "mt-4 max-md:pb-24 md:pb-8",
        ticketOpen && "max-md:pb-[18rem]",
      )}
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(280px,0.85fr)_minmax(360px,1.15fr)]">
        <div className="space-y-5">
          <RankPlate
            rank={displayRank}
            sr={sr}
            srInput={srInput}
            rankOptions={rankOptions}
            fee={rank.fee}
            mode={mode}
            boardRank={liveRank}
            onSrChange={patchSr}
            onRankChange={patchSr}
            onSrEditingChange={setEditingSr}
            cardRef={rankCardRef}
          />

          {mode === "mp" ? (
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs text-muted">SR per win</span>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={srPerWinInput}
                  onChange={(e) =>
                    startNextGame({
                      srPerWinInput: e.target.value,
                      srPerWin: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                    })
                  }
                  aria-describedby="win-help"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {RESULT_PRESETS.map((preset) => {
                  const placement =
                    WZ_PLACEMENTS.find((item) => item.id === preset.id) ?? WZ_PLACEMENTS[0]!;
                  const net = wzNetSr({
                    sr,
                    placement,
                    squadElims: preset.elims,
                    yourElims: Math.round(squadElimBaseline(preset.elims)),
                    rankDelta,
                    cutoffSr,
                  }).net;
                  const active = srPerWin === net && net > 0;
                  return (
                    <Button
                      key={preset.id}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      disabled={net <= 0}
                      onClick={() =>
                        startNextGame({
                          srPerWin: net,
                          srPerWinInput: String(net),
                        })
                      }
                    >
                      {preset.label}
                      <span className="numeric ml-1 text-[10px] opacity-80">{formatDelta(net)}</span>
                    </Button>
                  );
                })}
              </div>
              <span id="win-help" className="text-[11px] text-muted">
                Typical Warzone nets at your rank. Edit if your lobby pays differently.
              </span>
              <ApplyGameBar {...applyBarState} onAdd={addSr} onCancel={cancel} />
              <PostApplyPanel
                mode={mode}
                pendingMatchId={pendingMatchId}
                submitReceipt={submitReceipt}
                historyDoc={historyDoc}
                viewer={viewer}
                signedIn={signedIn}
                showAuthCta={showAuthCta}
                onTeammatesChange={savePendingTeammates}
                onFinishTeammates={finishTeammates}
                onNewMatch={startNewSubmission}
              />
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
            <h1 className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 font-semibold tracking-tight">
              <span className="accent-glow bg-linear-to-r from-geebung-600 to-geebung-500 bg-clip-text text-4xl text-transparent md:text-5xl">
                Climb
              </span>
              <span className="text-2xl text-muted">to</span>
              <span className="relative inline-flex items-center rounded-[6px] text-xl md:text-5xl focus-within:ring-2 focus-within:ring-accent">
                <span className="pointer-events-none inline-flex items-center gap-1.5">
                  {boardTarget ? (
                    <TickerNumeral value={boardTarget.rank} format={boardRankLabel} />
                  ) : (
                    resolved.label
                  )}
                  {climbOptions.length > 1 ? (
                    <CaretDown weight="bold" className="size-5 shrink-0 text-muted" />
                  ) : null}
                </span>
                <select
                  id="climb-target"
                  value={climbValue}
                  disabled={climbOptions.length === 1}
                  onChange={(e) => patch({ target: e.target.value as ClimbTarget })}
                  className="absolute inset-0 cursor-pointer appearance-none text-base opacity-0 disabled:cursor-default"
                  aria-label="Climb to rank"
                >
                  {climbOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </span>
              <span
                className={cn(
                  "numeric inline-flex items-baseline gap-1.5 text-xl leading-none md:text-5xl",
                  resolved.reached ? "text-muted" : "accent-glow text-accent",
                )}
              >
                <TickerNumeral
                  value={resolved.reached ? 0 : remaining}
                  skip={editingSr}
                />
                <span className="text-lg font-medium text-muted">SR</span>
              </span>
            </h1>
          </div>

          {mode === "wz" ? (
            <div className="mt-6 space-y-4">
              {pendingMatchId || submitReceipt ? (
                <PostApplyPanel
                  mode={mode}
                  pendingMatchId={pendingMatchId}
                  submitReceipt={submitReceipt}
                  historyDoc={historyDoc}
                  viewer={viewer}
                  signedIn={signedIn}
                  showAuthCta={showAuthCta}
                  onTeammatesChange={savePendingTeammates}
                  onFinishTeammates={finishTeammates}
                  onNewMatch={startNewSubmission}
                />
              ) : (
                <>
                  <SrInputMode value={entryMode} onChange={setEntryModeSafe} />
                  {entryMode === "photo" ? (
                    ocrResult ? (
                      <SrScanPreview
                        initial={ocrResult}
                        expectedFee={rank.fee}
                        onApply={applyOcrMatch}
                        onRetry={() => setOcrResult(null)}
                      />
                    ) : (
                      <SrScreenshotUpload
                        expectedFee={rank.fee}
                        onParsed={setOcrResult}
                        panelHeight={rankCardHeight}
                      />
                    )
                  ) : (
                    <>
              <div>
                <p className="text-xs text-muted">Eliminations</p>
                <div className="mt-2 flex flex-col gap-y-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted">
                      Squad
                    </span>
                    {COMMON_SQUAD_ELIMS.map((n) => (
                      <Button
                        key={n}
                        type="button"
                        size="sm"
                        variant={
                          squadElimsInput.trim() !== "" && squadElims === n ? "default" : "outline"
                        }
                        onClick={() => startNextGame({ squadElims: n, squadElimsInput: String(n) })}
                      >
                        {n}
                      </Button>
                    ))}
                    <Input
                      type="number"
                      min={0}
                      max={80}
                      inputMode="numeric"
                      placeholder="40"
                      value={squadElimsInput}
                      onChange={(e) =>
                        startNextGame({
                          squadElimsInput: e.target.value,
                          squadElims: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                        })
                      }
                      aria-label="Custom squad elims"
                      className="h-8 w-[3.25rem] px-1.5 text-center"
                    />
                  </div>
                  <span className="hidden text-border sm:inline" aria-hidden>
                    |
                  </span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted">
                      You
                    </span>
                    {COMMON_YOUR_ELIMS.map((n) => (
                      <Button
                        key={n}
                        type="button"
                        size="sm"
                        variant={
                          yourElimsInput.trim() !== "" && yourElimsClamped === n
                            ? "default"
                            : "outline"
                        }
                        onClick={() => startNextGame({ yourElims: n, yourElimsInput: String(n) })}
                      >
                        {n}
                      </Button>
                    ))}
                    <Input
                      type="number"
                      min={0}
                      max={80}
                      inputMode="numeric"
                      placeholder="8"
                      value={yourElimsInput}
                      onChange={(e) =>
                        startNextGame({
                          yourElimsInput: e.target.value,
                          yourElims: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                        })
                      }
                      aria-label="Custom your elims"
                      className="h-8 w-[3.25rem] px-1.5 text-center"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {wzScenarios.map((row) => {
                const selected = row.placement.id === placementId;
                const mutedNegative = progressivePreview && row.net < 0;
                const subline =
                  resolved.reached
                    ? "At target"
                    : row.games != null
                      ? `${row.games} game${row.games === 1 ? "" : "s"}`
                      : row.breakEvenElims != null
                        ? `${row.breakEvenElims} elim${row.breakEvenElims === 1 ? "" : "s"} to go positive`
                        : "Cannot climb";

                return (
                  <button
                    key={row.placement.id}
                    type="button"
                    onClick={() => startNextGame({ placement: row.placement.id })}
                    className={cn(
                      "rounded-[6px] border px-3 py-3 text-left transition-[transform,background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      selected
                        ? "relative z-10 -translate-y-0.5 border-accent bg-surface-elevated shadow-[0_6px_24px_rgb(0_0_0/0.28)] ring-1 ring-accent/25"
                        : "border-border bg-surface hover:border-border/80",
                    )}
                  >
                    <p
                      className={cn(
                        "text-sm font-semibold leading-tight",
                        row.placement.highlight && !mutedNegative
                          ? "text-accent"
                          : "text-muted",
                      )}
                    >
                      {row.placement.label}
                    </p>
                    <p
                      className={cn(
                        "numeric mt-2 text-lg leading-none",
                        row.net > 0 && "text-accent",
                        row.net < 0 && (mutedNegative ? "text-muted" : "text-negative"),
                        row.net === 0 && "text-muted",
                      )}
                    >
                      {formatDelta(row.net)}
                    </p>
                    {subline ? (
                      <p className="mt-2 text-[11px] text-muted">{subline}</p>
                    ) : null}
                  </button>
                );
              })}
              </div>
              <ApplyGameBar {...applyBarState} onAdd={addSr} onCancel={cancel} />
                    </>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="panel-elevated mt-6 px-4 py-4">
              <p className="text-xs text-muted">Wins to {resolved.label}</p>
              <p className="numeric mt-2 text-3xl font-semibold tracking-tight text-accent">
                {resolved.reached ? "0" : mpResult.games != null ? mpResult.games : "n/a"}
              </p>
              <p className="mt-2 text-sm text-muted">
                {resolved.reached
                  ? "Already at this target."
                  : mpResult.games == null
                    ? "Set SR per win above zero to estimate games."
                    : `${mpResult.games} win${mpResult.games === 1 ? "" : "s"} at +${formatSr(mpResult.net)} each.`}
              </p>
            </div>
          )}
        </div>
      </div>

      <RankTimeline
        currentSr={sr}
        projectedSr={projectedSr}
        cutoffSr={cutoffSr}
        rank={displayRank}
        skip={editingSr || !hydrated}
      />
      <SessionPanel
        doc={historyDoc}
        currentSr={sr}
        ticketOpen={ticketOpen}
        saveFailed={historySaveFailed || cloudSyncFailed}
        onRetrySync={retrySync}
        onUndo={undoLast}
        onEnd={endOpenSession}
        onDelete={deletePastSession}
      />
      <SrTicket
        open={ticketOpen}
        placementSr={placementSr}
        fee={rank.fee}
        yourSr={elimParts.yourSr}
        squadSr={elimParts.squadSr}
        elimSr={elimParts.elimSr}
        net={ticketNet}
        capped={elimParts.capped}
      />
    </div>
  );
}

function PostApplyPanel({
  mode,
  pendingMatchId,
  submitReceipt,
  historyDoc,
  viewer,
  signedIn,
  showAuthCta,
  onTeammatesChange,
  onFinishTeammates,
  onNewMatch,
}: {
  mode: Mode;
  pendingMatchId: string | null;
  submitReceipt: "success" | "error" | null;
  historyDoc: HistoryDocument;
  viewer: TeammateViewer | null;
  signedIn: boolean;
  showAuthCta: boolean;
  onTeammatesChange: (teammates: HistoryTeammate[]) => void;
  onFinishTeammates: () => void;
  onNewMatch: () => void;
}) {
  const reduce = useReducedMotion();
  if (!pendingMatchId && !submitReceipt && (signedIn || !showAuthCta)) return null;
  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait" initial={false}>
        {submitReceipt ? (
          <motion.div
            key="receipt"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={reduce ? { duration: 0 } : { duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <MatchSubmitReceipt status={submitReceipt} onNewMatch={onNewMatch} />
          </motion.div>
        ) : pendingMatchId ? (
          <motion.div
            key="picker"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={reduce ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            <TeammatePicker
              matchId={pendingMatchId}
              doc={historyDoc}
              viewer={viewer}
              onTeammatesChange={onTeammatesChange}
              onDismiss={onFinishTeammates}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      {signedIn || !showAuthCta ? null : <SaveClimbCta nextPath={`/${mode}/calc`} />}
    </div>
  );
}

function ApplyGameBar({
  net,
  canCancel,
  canApply = net !== 0,
  selected = false,
  progressive = false,
  onAdd,
  onCancel,
}: {
  net: number;
  canCancel: boolean;
  canApply?: boolean;
  selected?: boolean;
  progressive?: boolean;
  onAdd: () => void;
  onCancel: () => void;
}) {
  const label =
    progressive && !selected
      ? "Select a result"
      : selected && net !== 0
        ? `Add ${formatDelta(net)} SR`
        : net !== 0
          ? `Add ${formatDelta(net)} SR`
          : "Add 0 SR";

  return (
    <div className={cn("flex gap-2", selected && canApply ? "flex-col sm:flex-row" : "flex-wrap")}>
      <Button
        type="button"
        className={cn(selected && canApply && "w-full sm:flex-1")}
        disabled={!canApply}
        onClick={onAdd}
      >
        {label}
      </Button>
      <Button
        type="button"
        variant="outline"
        className={cn(selected && canApply && "w-full sm:w-auto")}
        disabled={!canCancel}
        onClick={onCancel}
      >
        Cancel
      </Button>
    </div>
  );
}
