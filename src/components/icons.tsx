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

const CLIMB_MARK_PATH =
  "M10 205 L18 190 L70 126 L91 103 L98 101 L105 104 L126 126 L129 128 L134 128 L219 27 L237 8 L244 8 L247 12 L248 111 L247 239 L245 243 L239 247 L164 248 L13 246 L8 238 L9 206 Z";

export function ClimbSessionIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 256 256" className={cn("shrink-0", className)}>
      <defs>
        <linearGradient id="climb-session-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fcf8c5" />
          <stop offset="45%" stopColor="#f2c81d" />
          <stop offset="100%" stopColor="#ca8d0b" />
        </linearGradient>
      </defs>
      <path fill="url(#climb-session-gold)" d={CLIMB_MARK_PATH} />
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
