import { Skull, Trophy } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
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

const MATCH_LIMIT = 5;
const MAX_TEAMMATES = 2;

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
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-medium tracking-[0.12em] text-muted uppercase">
          {label}
        </span>
        <span className="numeric text-sm font-semibold leading-none text-foreground">
          {formatSr(value)}
        </span>
      </div>
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
      <p className="numeric mt-1 text-[10px] text-muted/80">
        {formatSr(value)} / {formatSr(max)} SR
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

function TeammateStack({ teammates }: { teammates: ProfileTeammate[] }) {
  const shown = teammates.slice(0, MAX_TEAMMATES);
  if (shown.length === 0) {
    return <span className="text-xs text-muted">Solo</span>;
  }

  return (
    <ul
      className="flex items-center"
      aria-label={`Teammates: ${shown.map((teammate) => teammate.displayName).join(", ")}`}
    >
      {shown.map((teammate, index) => {
        const avatar = (
          <span
            className={cn(
              "relative flex size-7 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-[10px] font-semibold text-muted",
              index > 0 && "-ml-2",
            )}
            style={{ zIndex: shown.length - index }}
            title={teammate.displayName}
          >
            {teammate.avatarUrl ? (
              <Image
                src={teammate.avatarUrl}
                alt=""
                width={28}
                height={28}
                className="size-full object-cover"
              />
            ) : (
              initials(teammate.displayName)
            )}
          </span>
        );

        return (
          <li key={`${teammate.displayName}-${index}`}>
            {teammate.slug ? (
              <Link
                href={`/players/${teammate.slug}`}
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

function MatchRow({ match }: { match: ProfileMatch }) {
  const placementDef = WZ_PLACEMENTS.find((item) => item.id === match.placement);
  const placement =
    placementDef?.label ?? match.placement;
  const placementSr = placementDef?.placementSr ?? 0;
  const elimSr = elimSrBreakdown(match.squadElims, match.yourElims).elimSr;

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="inline-flex shrink-0 items-center gap-1 rounded-[4px] border border-border bg-surface px-2 py-1 text-xs font-semibold text-foreground">
        {match.placement === "first" ? (
          <Trophy
            weight="fill"
            className="size-3.5 shrink-0 text-geebung-400 drop-shadow-[0_0_6px_color-mix(in_oklab,var(--geebung-400)_45%,transparent)]"
            aria-hidden
          />
        ) : null}
        {placement}
      </span>
      <div className="min-w-0 flex-1">
        <div className="grid grid-cols-2 gap-3">
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
        </div>
      </div>
      <p className={cn("numeric shrink-0 text-base font-semibold", netClass(match.net))}>
        {formatDelta(match.net)}
      </p>
      <div className="w-14 shrink-0">
        <TeammateStack teammates={match.teammates} />
      </div>
    </li>
  );
}

export function MatchHistory({ matches }: { matches: ProfileMatch[] }) {
  const recent = matches.slice(0, MATCH_LIMIT);

  return (
    <ProfileBlob title="Match history" className="h-full min-h-80">
      {recent.length === 0 ? (
        <p className="text-sm text-muted">No matches logged yet.</p>
      ) : (
        <ol className="divide-y divide-border">
          {recent.map((match) => (
            <MatchRow key={match.id} match={match} />
          ))}
        </ol>
      )}
    </ProfileBlob>
  );
}
