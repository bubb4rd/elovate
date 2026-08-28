"use client";

import { CaretDown, Medal, PlusMinus, Skull, Trophy } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ProfileBlob } from "@/components/profile/profile-blob";
import { SquadUsersIcon } from "@/components/icons";
import { formatDelta, formatLocalTime, formatSr } from "@/lib/format";
import {
  WZ_ELIM_CAP,
  WZ_PLACEMENT_MAX,
  WZ_PLACEMENTS,
  elimSrBreakdown,
} from "@/lib/ranked";
import type { ProfileMatch, ProfileTeammate } from "@/lib/profile/types";
import { cn } from "@/lib/utils";

export const MATCH_LIMIT = 5;
const MAX_TEAMMATES = 3;
const EASE = [0.16, 1, 0.3, 1] as const;
export const MATCH_HIGHLIGHT_MS = 1400;

const panelTransition = { duration: 0.28, ease: EASE };
const metricVariants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: EASE },
  },
};
const metricsContainerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.035, delayChildren: 0.04 },
  },
};
const chipVariants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.22, ease: EASE },
  },
};

function netClass(net: number) {
  if (net > 0) return "accent-glow text-accent";
  if (net < 0) return "text-negative";
  return "text-zinc-500";
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function placementLabel(match: ProfileMatch): string {
  return WZ_PLACEMENTS.find((item) => item.id === match.placement)?.label ?? match.placement;
}

function ColumnLabel({
  children,
  icon,
}: {
  children: string;
  icon?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-[0.12em] text-muted uppercase">
      {icon}
      {children}
    </span>
  );
}

function SrMetricColumn({
  label,
  icon,
  value,
  max,
  footer,
  reduceMotion = false,
}: {
  label: string;
  icon?: React.ReactNode;
  value: number;
  max: number;
  footer?: React.ReactNode;
  reduceMotion?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <motion.div
      className="min-w-0"
      variants={reduceMotion ? undefined : metricVariants}
    >
      <ColumnLabel icon={icon}>{label}</ColumnLabel>
      <div
        className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/10"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${formatSr(value)} of ${formatSr(max)} SR`}
      >
        <motion.span
          className="profile-theme-gradient block h-full origin-left rounded-full"
          style={{
            width: `${pct}%`,
            boxShadow: "0 0 8px color-mix(in oklab, var(--accent) 40%, transparent)",
          }}
          initial={reduceMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.38, delay: 0.06, ease: EASE }
          }
        />
      </div>
      <p className="numeric mt-1.5 leading-none">
        <span className="text-base font-semibold text-accent">{formatSr(value)}</span>
        <span className="text-[10px] text-muted/80"> / {formatSr(max)}</span>
      </p>
      {footer}
    </motion.div>
  );
}

function ElimCounts({
  squadElims,
  yourElims,
  personalLabel,
}: {
  squadElims: number;
  yourElims: number;
  personalLabel: string;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
      <span className="inline-flex items-center gap-1">
        <Skull weight="fill" className="size-3 shrink-0" aria-hidden />
        <span className="numeric font-medium text-foreground">{squadElims}</span>
        <span>sq</span>
      </span>
      <span className="inline-flex max-w-full items-center gap-1">
        <Skull weight="fill" className="size-3 shrink-0" aria-hidden />
        <span className="numeric font-medium text-foreground">{yourElims}</span>
        <span className="min-w-0 truncate" title={personalLabel}>
          {personalLabel}
        </span>
      </span>
    </div>
  );
}

function TeammateAvatar({
  teammate,
  size = 28,
}: {
  teammate: ProfileTeammate;
  size?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(teammate.avatarUrl) && !imageFailed;
  const textClass = size <= 24 ? "text-[9px]" : "text-[10px]";

  return (
    <span
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-full border border-border bg-surface font-semibold tracking-wide text-foreground",
        textClass,
      )}
      style={{ width: size, height: size }}
      title={teammate.displayName}
    >
      {showImage && teammate.avatarUrl ? (
        <Image
          src={teammate.avatarUrl}
          alt=""
          width={size}
          height={size}
          className="size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initials(teammate.displayName) || "?"
      )}
    </span>
  );
}

function TeammateStack({
  teammates,
  size = 28,
}: {
  teammates: ProfileTeammate[];
  size?: number;
}) {
  const shown = teammates.slice(0, MAX_TEAMMATES);
  if (shown.length === 0) {
    return (
      <span className="text-xs text-muted" title="No teammates logged">
        N/A
      </span>
    );
  }

  return (
    <ul
      className="flex items-center"
      aria-label={`Teammates: ${shown.map((teammate) => teammate.displayName).join(", ")}`}
    >
      {shown.map((teammate, index) => {
        const avatar = <TeammateAvatar teammate={teammate} size={size} />;

        return (
          <li
            key={`${teammate.slug ?? teammate.displayName}-${index}`}
            className={cn(index > 0 && "-ml-1.5")}
            style={{ zIndex: shown.length - index }}
          >
            {teammate.slug ? (
              <Link
                href={`/players/${teammate.slug}`}
                aria-label={teammate.displayName}
                className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={(event) => event.stopPropagation()}
              >
                {avatar}
              </Link>
            ) : (
              avatar
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PlacementBadge({
  match,
  compact = false,
}: {
  match: ProfileMatch;
  compact?: boolean;
}) {
  const placement = placementLabel(match);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-[4px] border border-border bg-surface font-semibold text-foreground",
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs",
      )}
    >
      {match.placement === "first" ? (
        <Trophy
          weight="fill"
          className={cn(
            "shrink-0 text-geebung-400 drop-shadow-[0_0_6px_color-mix(in_oklab,var(--geebung-400)_45%,transparent)]",
            compact ? "size-3" : "size-3.5",
          )}
          aria-hidden
        />
      ) : null}
      {placement}
    </span>
  );
}

function MatchRowExpanded({
  match,
  personalLabel,
  canMinimize,
  onMinimize,
  reduceMotion,
}: {
  match: ProfileMatch;
  personalLabel: string;
  canMinimize: boolean;
  onMinimize: () => void;
  reduceMotion: boolean;
}) {
  const placementDef = WZ_PLACEMENTS.find((item) => item.id === match.placement);
  const placementSr = placementDef?.placementSr ?? 0;
  const elimSr = elimSrBreakdown(match.squadElims, match.yourElims).elimSr;

  return (
    <div className={cn("relative flex items-start gap-3 py-3", canMinimize && "pr-7")}>
      <motion.span
        className="mt-[1.375rem]"
        variants={reduceMotion ? undefined : chipVariants}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
      >
        <PlacementBadge match={match} />
      </motion.span>
      <motion.div
        className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-3"
        variants={reduceMotion ? undefined : metricsContainerVariants}
        initial={reduceMotion ? false : "hidden"}
        animate="show"
      >
        <SrMetricColumn
          label="Placement"
          icon={<Medal weight="fill" className="size-3 shrink-0 text-muted" aria-hidden />}
          value={placementSr}
          max={WZ_PLACEMENT_MAX}
          reduceMotion={reduceMotion}
          footer={
            <p className="numeric mt-1 text-[10px] text-muted/80">
              {formatLocalTime(match.createdAt)}
            </p>
          }
        />
        <SrMetricColumn
          label="Elims"
          icon={<Skull weight="fill" className="size-3 shrink-0 text-muted" aria-hidden />}
          value={elimSr}
          max={WZ_ELIM_CAP}
          reduceMotion={reduceMotion}
          footer={
            <ElimCounts
              squadElims={match.squadElims}
              yourElims={match.yourElims}
              personalLabel={personalLabel}
            />
          }
        />
        <motion.div
          className="min-w-14"
          variants={reduceMotion ? undefined : metricVariants}
        >
          <ColumnLabel
            icon={<PlusMinus weight="bold" className="size-3 shrink-0 text-muted" aria-hidden />}
          >
            Total
          </ColumnLabel>
          <div className="mt-2 h-1" aria-hidden />
          <p
            className={cn(
              "numeric mt-1.5 leading-none text-base font-semibold",
              netClass(match.net),
            )}
          >
            {formatDelta(match.net)}
          </p>
        </motion.div>
        <motion.div
          className="min-w-16"
          variants={reduceMotion ? undefined : metricVariants}
        >
          <ColumnLabel
            icon={<SquadUsersIcon className="size-3 text-muted" />}
          >
            Squad
          </ColumnLabel>
          <div className="mt-2 h-1" aria-hidden />
          <div className="mt-1.5">
            <TeammateStack teammates={match.teammates} />
          </div>
        </motion.div>
      </motion.div>
      {canMinimize ? (
        <motion.button
          type="button"
          onClick={onMinimize}
          className="absolute top-2.5 right-0 inline-flex size-6 items-center justify-center rounded-[4px] text-muted/70 hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Minimize match"
          aria-expanded
          initial={reduceMotion ? false : { opacity: 0, rotate: -90 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: EASE }}
        >
          <CaretDown weight="bold" className="size-3 rotate-180" aria-hidden />
        </motion.button>
      ) : null}
    </div>
  );
}

function MatchRowMinimized({
  match,
  reduceMotion,
}: {
  match: ProfileMatch;
  reduceMotion: boolean;
}) {
  const placementDef = WZ_PLACEMENTS.find((item) => item.id === match.placement);
  const placementSr = placementDef?.placementSr ?? 0;
  const elimSr = elimSrBreakdown(match.squadElims, match.yourElims).elimSr;

  return (
    <motion.div
      className="flex items-center gap-3 py-2.5"
      variants={reduceMotion ? undefined : metricsContainerVariants}
      initial={reduceMotion ? false : "hidden"}
      animate="show"
    >
      <motion.span variants={reduceMotion ? undefined : chipVariants}>
        <PlacementBadge match={match} compact />
      </motion.span>
      <motion.span
        className="inline-flex shrink-0 items-center gap-1"
        title={`Placement ${formatSr(placementSr)} SR`}
        variants={reduceMotion ? undefined : metricVariants}
      >
        <Medal weight="fill" className="size-3.5 shrink-0 text-muted" aria-hidden />
        <span className="numeric text-sm font-semibold leading-none text-accent">
          {formatSr(placementSr)}
        </span>
      </motion.span>
      <motion.span
        className="inline-flex shrink-0 items-center gap-1"
        title={`Elims ${formatSr(elimSr)} SR`}
        variants={reduceMotion ? undefined : metricVariants}
      >
        <Skull weight="fill" className="size-3.5 shrink-0 text-muted" aria-hidden />
        <span className="numeric text-sm font-semibold leading-none text-accent">
          {formatSr(elimSr)}
        </span>
      </motion.span>
      <motion.span
        className="inline-flex shrink-0 items-center gap-1"
        title={`Total ${formatDelta(match.net)} SR`}
        variants={reduceMotion ? undefined : metricVariants}
      >
        <PlusMinus weight="bold" className="size-3.5 shrink-0 text-muted" aria-hidden />
        <span
          className={cn(
            "numeric text-sm font-semibold leading-none",
            netClass(match.net),
          )}
        >
          {formatDelta(match.net)}
        </span>
      </motion.span>
      <motion.p
        className="numeric min-w-0 flex-1 truncate text-[11px] text-muted"
        variants={reduceMotion ? undefined : metricVariants}
      >
        {formatLocalTime(match.createdAt)}
      </motion.p>
      <motion.div
        className="inline-flex shrink-0 items-center gap-1.5"
        variants={reduceMotion ? undefined : chipVariants}
      >
        <SquadUsersIcon className="size-3.5 text-muted" />
        <TeammateStack teammates={match.teammates} size={22} />
      </motion.div>
      <motion.span
        variants={reduceMotion ? undefined : chipVariants}
        className="inline-flex"
      >
        <CaretDown
          weight="bold"
          className="size-3 shrink-0 text-muted/70"
          aria-hidden
        />
      </motion.span>
    </motion.div>
  );
}

function MatchRow({
  match,
  expanded,
  highlighted,
  personalLabel,
  canMinimize,
  reduceMotion,
  onExpand,
  onMinimize,
}: {
  match: ProfileMatch;
  expanded: boolean;
  highlighted: boolean;
  personalLabel: string;
  canMinimize: boolean;
  reduceMotion: boolean;
  onExpand: () => void;
  onMinimize: () => void;
}) {
  const swapTransition = reduceMotion
    ? { duration: 0 }
    : panelTransition;

  return (
    <div
      className={cn(
        "transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        highlighted && "bg-accent/10",
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {expanded ? (
          <motion.div
            key="expanded"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={swapTransition}
          >
            <MatchRowExpanded
              match={match}
              personalLabel={personalLabel}
              canMinimize={canMinimize}
              onMinimize={onMinimize}
              reduceMotion={reduceMotion}
            />
          </motion.div>
        ) : (
          <motion.div
            key="minimized"
            initial={reduceMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={swapTransition}
          >
            <button
              type="button"
              onClick={onExpand}
              className="w-full text-left hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              aria-expanded={false}
              aria-label={`Expand ${placementLabel(match)} match, ${formatDelta(match.net)} SR`}
            >
              <MatchRowMinimized match={match} reduceMotion={reduceMotion} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MatchHistory({
  matches,
  enteredId = null,
  highlightId = null,
  personalLabel = "you",
}: {
  matches: ProfileMatch[];
  enteredId?: string | null;
  highlightId?: string | null;
  personalLabel?: string;
}) {
  const reduce = useReducedMotion();
  const recent = matches.slice(0, MATCH_LIMIT);
  const latestId = recent[0]?.id ?? null;
  const recentKey = recent.map((match) => match.id).join(",");
  const [expandedId, setExpandedId] = useState<string | null>(latestId);

  useEffect(() => {
    if (enteredId) {
      setExpandedId(enteredId);
      return;
    }
    setExpandedId((current) => {
      if (current && recentKey.split(",").includes(current)) return current;
      return latestId;
    });
  }, [enteredId, latestId, recentKey]);

  const itemTransition = reduce
    ? { duration: 0.12 }
    : {
        duration: 0.22,
        ease: EASE,
        layout: { duration: 0.28, ease: EASE },
      };

  return (
    <ProfileBlob title="Match history" className="h-full min-h-80">
      <AnimatePresence mode="wait" initial={false}>
        {recent.length === 0 ? (
          <motion.p
            key="empty"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
            className="text-sm text-muted"
          >
            No matches logged yet.
          </motion.p>
        ) : (
          <motion.ol
            key="list"
            initial={false}
            exit={reduce ? { opacity: 0 } : { opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.16, ease: EASE }}
            className="divide-y divide-border"
          >
            <AnimatePresence initial={false}>
              {recent.map((match) => {
                const entering = match.id === enteredId;
                const expanded = match.id === expandedId;
                return (
                  <motion.li
                    key={match.id}
                    layout="position"
                    initial={
                      entering && !reduce
                        ? { opacity: 0, y: -10 }
                        : false
                    }
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={itemTransition}
                  >
                    <MatchRow
                      match={match}
                      expanded={expanded}
                      highlighted={highlightId === match.id}
                      personalLabel={personalLabel}
                      canMinimize={expanded && match.id !== latestId}
                      reduceMotion={Boolean(reduce)}
                      onExpand={() => setExpandedId(match.id)}
                      onMinimize={() => setExpandedId(latestId)}
                    />
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ol>
        )}
      </AnimatePresence>
    </ProfileBlob>
  );
}
