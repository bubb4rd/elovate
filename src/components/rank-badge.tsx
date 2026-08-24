import { useId } from "react";
import {
  Crown,
  Diamond,
  Flame,
  Hexagon,
  Medal,
  Sparkle,
  Trophy,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { DIVISION_TONE, TIER_ROMAN, type RankInfo } from "@/lib/ranked";

const ICONS = {
  bronze: Medal,
  silver: Medal,
  gold: Trophy,
  platinum: Hexagon,
  diamond: Diamond,
  crimson: Flame,
  iridescent: Sparkle,
  top250: Crown,
} as const;

export function RankBadge({ rank, className }: { rank: RankInfo; className?: string }) {
  const tone = DIVISION_TONE[rank.division];
  const Icon = ICONS[rank.division];
  const roman = rank.tier ? TIER_ROMAN[rank.tier] : "I";
  const gid = `rank-fill-${useId().replace(/:/g, "")}`;

  return (
    <div className={cn("relative inline-flex", className)} aria-hidden>
      <svg
        viewBox="0 0 120 134"
        className="h-40 w-36 md:h-48 md:w-44"
        style={{ filter: `drop-shadow(0 8px 18px ${tone.glow}55)` }}
      >
        <defs>
          <linearGradient id={gid} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor={tone.fill2} />
            <stop offset="100%" stopColor={tone.fill} />
          </linearGradient>
        </defs>
        <polygon
          points="60,6 112,36 112,98 60,128 8,98 8,36"
          fill={`url(#${gid})`}
          stroke={tone.glow}
          strokeWidth="3"
        />
        <polygon points="60,16 102,40 102,92 60,116 18,92 18,40" fill="rgb(0 0 0 / 0.28)" />
        <text
          x="60"
          y="110"
          textAnchor="middle"
          fill="#f4f4f5"
          fontSize="12"
          fontWeight="700"
          letterSpacing="0.14em"
        >
          {roman}
        </text>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-7">
        <Icon weight="fill" className="size-14 md:size-16" style={{ color: tone.text }} />
      </div>
    </div>
  );
}
