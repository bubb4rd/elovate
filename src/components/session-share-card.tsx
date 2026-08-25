"use client";

import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
  SESSION_SHARE_HEIGHT,
  SESSION_SHARE_WIDTH,
  shareCardCopy,
} from "@/lib/history/share";
import type { SessionSummary } from "@/lib/history";

const goldFill: CSSProperties = {
  backgroundImage: "linear-gradient(90deg, #fcf8c5 0%, #f2c81d 50%, #ca8d0b 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
};

/** Matches Figma gold glow: 0 0 10px rgba(242,200,29,0.5) */
const goldGlow: CSSProperties = {
  filter: "drop-shadow(0 0 10px rgba(242, 200, 29, 0.5))",
};

const goldGlowSoft: CSSProperties = {
  filter: "drop-shadow(0 0 6px rgba(242, 200, 29, 0.35))",
};

export function SessionShareCard({
  summary,
  className,
  style,
  ...props
}: {
  summary: SessionSummary;
} & ComponentProps<"article">) {
  const copy = shareCardCopy(summary);
  const netStyle: CSSProperties =
    summary.net > 0
      ? { ...goldFill, ...goldGlow }
      : { color: summary.net < 0 ? "#e8a0a0" : "#a1a1aa" };

  return (
    <article
      aria-label={copy.alt}
      className={cn("relative isolate overflow-hidden font-sans text-white", className)}
      style={{
        width: SESSION_SHARE_WIDTH,
        height: SESSION_SHARE_HEIGHT,
        backgroundColor: "#0b0b0b",
        borderRadius: 20,
        ...style,
      }}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute flex h-[496px] w-[882px] items-center justify-center mix-blend-luminosity"
        style={{ left: -141, top: -71 }}
      >
        <div className="-rotate-90">
          <div className="relative h-[882px] w-[496px]">
            <img
              alt=""
              src="/share/bg.png"
              width={496}
              height={882}
              draggable={false}
              className="absolute inset-0 size-full max-w-none object-cover opacity-50"
            />
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute top-[53px] left-[352px] h-[208px] w-[255px]"
      >
        <div
          className="absolute"
          style={{
            inset: "-12.5% -10.2%",
          }}
        >
          <img
            alt=""
            src="/share/peak.svg"
            width={307}
            height={260}
            draggable={false}
            className="block size-full max-w-none"
          />
        </div>
      </div>

      <div className="relative flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <span className="relative inline-block h-[24.497px] w-[29.26px] shrink-0">
            <span
              className="absolute block"
              style={{ inset: "-40.82% -34.18%" }}
            >
              <img
                alt=""
                src="/share/mark.svg"
                width={49.26}
                height={44.5}
                draggable={false}
                className="block size-full max-w-none"
              />
            </span>
          </span>
          <p className="text-[20px] leading-none whitespace-nowrap">
            <span className="inline-block font-bold" style={{ ...goldFill, ...goldGlowSoft }}>
              elo
            </span>
            <span className="font-normal">vate</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <p className="text-[18px] leading-none text-[#d9d9d9]">{copy.modeLabel}</p>
          <p
            className="flex h-[26px] w-[76px] items-center justify-center rounded-[8px] border border-geebung-100 text-[18px] leading-none"
            style={{ ...goldFill, ...goldGlowSoft }}
          >
            {copy.playlistLabel}
          </p>
        </div>
      </div>

      <div className="absolute top-[50px] left-[10px] flex items-end gap-0">
        <p
          className="text-[97.28px] leading-[1.21] font-bold tracking-tight whitespace-nowrap"
          style={netStyle}
        >
          {copy.netLabel}
        </p>
        <p
          className="-ml-3 mb-[11px] text-[34.477px] leading-none font-bold text-[#d9d9d9]"
          style={{ textShadow: "-1.077px -1.077px 11.744px black" }}
        >
          SR
        </p>
      </div>

      <p className="absolute bottom-5 left-5 text-[14px] leading-none text-[#d9d9d9]/50">
        {copy.dateLabel} • {copy.gamesLabel}
      </p>
    </article>
  );
}
