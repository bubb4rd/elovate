import { useId } from "react";
import { DIVISION_TONE, type DivisionId } from "@/lib/ranked";
import { IRIDESCENT_GRADIENT_STOPS } from "@/lib/profile/themes";
import { cn } from "@/lib/utils";

export function BoardPodiumIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        maskImage: "url(/icons/board-podium.png)",
        WebkitMaskImage: "url(/icons/board-podium.png)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

export function SquadUsersIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        maskImage: "url(/icons/squad-users.png)",
        WebkitMaskImage: "url(/icons/squad-users.png)",
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

const CLIMB_MARK_PATH =
  "M10 205 L18 190 L70 126 L91 103 L98 101 L105 104 L126 126 L129 128 L134 128 L219 27 L237 8 L244 8 L247 12 L248 111 L247 239 L245 243 L239 247 L164 248 L13 246 L8 238 L9 206 Z";

export function ClimbSessionIcon({ className }: { className?: string }) {
  const gradientId = `climb-gold-${useId().replace(/:/g, "")}`;
  return (
    <svg aria-hidden viewBox="0 0 256 256" className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fcf8c5" />
          <stop offset="45%" stopColor="#f2c81d" />
          <stop offset="100%" stopColor="#ca8d0b" />
        </linearGradient>
      </defs>
      <path fill={`url(#${gradientId})`} d={CLIMB_MARK_PATH} />
    </svg>
  );
}

export function ClimbMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 256 256" className={cn("shrink-0", className)}>
      <path fill="currentColor" d={CLIMB_MARK_PATH} />
    </svg>
  );
}

/**
 * The elovate mark, filled with a given division's rank gradient. Iridescent
 * uses the app's canonical pastel iridescent gradient (same as the profile
 * page theme and banner) rather than `DIVISION_TONE.iridescent`, whose
 * saturated purple/magenta reads as the unrelated "Nebula" theme instead.
 */
export function RankMark({
  division,
  className,
}: {
  division: DivisionId;
  className?: string;
}) {
  const gradientId = `rank-mark-${useId().replace(/:/g, "")}`;
  const stops =
    division === "iridescent"
      ? IRIDESCENT_GRADIENT_STOPS
      : [
          { offset: "0%", color: DIVISION_TONE[division].fill2 },
          { offset: "100%", color: DIVISION_TONE[division].fill },
        ];
  return (
    <svg aria-hidden viewBox="0 0 256 256" className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id={gradientId} x1="20%" y1="0%" x2="80%" y2="100%">
          {stops.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </linearGradient>
      </defs>
      <path fill={`url(#${gradientId})`} d={CLIMB_MARK_PATH} />
    </svg>
  );
}
