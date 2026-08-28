"use client";

import { Skull, Trophy } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ProfileBlob } from "@/components/profile/profile-blob";
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

function ColumnLabel({ children }: { children: string }) {
  return (
    <span className="text-[10px] font-medium tracking-[0.12em] text-muted uppercase">
      {children}
    </span>
  );
}

function SrMetricColumn({
  label,
  value,
  max,
  footer,
}: {
  label: string;
  value: number;
  max: number;
  footer?: React.ReactNode;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className="min-w-0">
      <ColumnLabel>{label}</ColumnLabel>
      <div
        className="mt-2 h-1 overflow-hidden rounded-full bg-foreground/10"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${formatSr(value)} of ${formatSr(max)} SR`}
      >
        <span
          className="profile-theme-gradient block h-full rounded-full"
          style={{
            width: `${pct}%`,
            boxShadow: "0 0 8px color-mix(in oklab, var(--accent) 40%, transparent)",
          }}
        />
      </div>
      <p className="numeric mt-1.5 leading-none">
        <span className="text-base font-semibold text-accent">{formatSr(value)}</span>
        <span className="text-[10px] text-muted/80"> / {formatSr(max)}</span>
      </p>
      {footer}
    </div>
  );
}

function ElimCounts({ squadElims, yourElims }: { squadElims: number; yourElims: number }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
      <span className="inline-flex items-center gap-1">
        <Skull weight="fill" className="size-3 shrink-0" aria-hidden />
        <span className="numeric font-medium text-foreground">{squadElims}</span>
        <span>sq</span>
      </span>
      <span className="inline-flex items-center gap-1">
        <Skull weight="fill" className="size-3 shrink-0" aria-hidden />
        <span className="numeric font-medium text-foreground">{yourElims}</span>
        <span>you</span>
      </span>
    </div>
  );
}

function TeammateAvatar({ teammate }: { teammate: ProfileTeammate }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(teammate.avatarUrl) && !imageFailed;

  return (
    <span
      className="relative flex size-7 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-[10px] font-semibold tracking-wide text-foreground"
      title={teammate.displayName}
    >
      {showImage && teammate.avatarUrl ? (
        <Image
          src={teammate.avatarUrl}
          alt=""
          width={28}
          height={28}
          className="size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initials(teammate.displayName) || "?"
      )}
    </span>
  );
}

function TeammateStack({ teammates }: { teammates: ProfileTeammate[] }) {
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
        const avatar = <TeammateAvatar teammate={teammate} />;

        return (
          <li
            key={`${teammate.slug ?? teammate.displayName}-${index}`}
            className={cn(index > 0 && "-ml-2")}
            style={{ zIndex: shown.length - index }}
          >
            {teammate.slug ? (
              <Link
                href={`/players/${teammate.slug}`}
                aria-label={teammate.displayName}
                className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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

function MatchRow({
  match,
  highlighted,
}: {
  match: ProfileMatch;
  highlighted: boolean;
}) {
  const placementDef = WZ_PLACEMENTS.find((item) => item.id === match.placement);
  const placement =
    placementDef?.label ?? match.placement;
  const placementSr = placementDef?.placementSr ?? 0;
  const elimSr = elimSrBreakdown(match.squadElims, match.yourElims).elimSr;

  return (
    <div
      className={cn(
        "flex items-start gap-3 py-3 transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        highlighted && "bg-accent/10",
      )}
    >
      <span className="mt-[1.375rem] inline-flex shrink-0 items-center gap-1 rounded-[4px] border border-border bg-surface px-2 py-1 text-xs font-semibold text-foreground">
        {match.placement === "first" ? (
          <Trophy
            weight="fill"
            className="size-3.5 shrink-0 text-geebung-400 drop-shadow-[0_0_6px_color-mix(in_oklab,var(--geebung-400)_45%,transparent)]"
            aria-hidden
          />
        ) : null}
        {placement}
      </span>
      <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] gap-3">
        <SrMetricColumn
          label="Placement"
          value={placementSr}
          max={WZ_PLACEMENT_MAX}
          footer={
            <p className="numeric mt-1 text-[10px] text-muted/80">
              {formatLocalTime(match.createdAt)}
            </p>
          }
        />
        <SrMetricColumn
          label="Elims"
          value={elimSr}
          max={WZ_ELIM_CAP}
          footer={
            <ElimCounts squadElims={match.squadElims} yourElims={match.yourElims} />
          }
        />
        <div className="min-w-14">
          <ColumnLabel>Total</ColumnLabel>
          <div className="mt-2 h-1" aria-hidden />
          <p
            className={cn(
              "numeric mt-1.5 leading-none text-base font-semibold",
              netClass(match.net),
            )}
          >
            {formatDelta(match.net)}
          </p>
        </div>
        <div className="min-w-16">
          <ColumnLabel>Squad</ColumnLabel>
          <div className="mt-2 h-1" aria-hidden />
          <div className="mt-1.5">
            <TeammateStack teammates={match.teammates} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MatchHistory({
  matches,
  enteredId = null,
  highlightId = null,
}: {
  matches: ProfileMatch[];
  enteredId?: string | null;
  highlightId?: string | null;
}) {
  const reduce = useReducedMotion();
  const recent = matches.slice(0, MATCH_LIMIT);
  const itemTransition = reduce
    ? { duration: 0.12 }
    : { duration: 0.32, ease: EASE, layout: { duration: 0.32, ease: EASE } };

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
                return (
                  <motion.li
                    key={match.id}
                    layout
                    initial={
                      entering && !reduce
                        ? { opacity: 0, y: -8, height: 0 }
                        : false
                    }
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    transition={itemTransition}
                    className="overflow-hidden"
                  >
                    <MatchRow
                      match={match}
                      highlighted={highlightId === match.id}
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
