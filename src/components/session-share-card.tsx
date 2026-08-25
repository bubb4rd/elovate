"use client";

import { useId, type ComponentProps, type CSSProperties } from "react";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";
import {
  SESSION_SHARE_HEIGHT,
  SESSION_SHARE_WIDTH,
  shareCardCopy,
} from "@/lib/history/share";
import type { SessionSummary } from "@/lib/history";

const PEAK_PATH =
  "M104.504 208.966C103.572 208.966 102.644 208.969 101.712 208.969C71.348 208.894 40.9838 208.822 10.6195 208.747C10.274 208.703 9.92499 208.655 9.57946 208.611C7.05609 207.411 4.80495 206.565 3.1227 204.198C0.717994 200.815 1.01814 197.058 1.02512 193.122C1.0321 187.837 0.94834 182.548 1.05304 177.265C1.1054 176.457 1.16124 175.646 1.21359 174.838C2.64804 171.025 3.28325 168.369 5.92877 165.02C8.59524 161.641 12.6333 159.257 15.1462 155.775C15.3801 155.547 15.6139 155.315 15.8478 155.083C16.4236 154.517 16.9995 153.954 17.5754 153.388C17.8127 153.149 18.0465 152.914 18.2804 152.679C20.4827 150.524 22.6815 148.368 24.8837 146.213C25.1246 145.981 25.3654 145.75 25.6027 145.518C27.7212 143.874 29.571 141.726 31.4627 139.83C34.3909 136.894 37.3959 134.033 40.3102 131.086C50.9307 120.344 61.6559 109.627 72.573 99.1747C75.8607 96.0238 78.9949 92.7194 82.2791 89.5651C83.909 88.0033 85.4202 86.1823 87.3887 85.0127C90.0307 83.4338 92.7251 82.745 95.779 82.4176C96.477 82.4176 97.175 82.4176 97.8731 82.4176C100.396 82.7347 102.791 83.2701 105.028 84.508C107.104 85.6572 108.623 87.2974 110.336 88.8797C114.162 92.4091 117.879 96.0545 121.711 99.5737C124.513 102.148 126.967 105.074 130.939 105.865C139.322 107.529 144.243 99.751 149.398 94.7825C162.989 81.6913 175.979 68.01 189.542 54.8949C204.801 40.1429 219.564 24.8896 234.68 9.99439C239.29 5.45216 244.787 -2.23756 252.158 2.47517C253.094 3.07534 253.785 3.80851 254.406 4.71559C256.79 8.19728 255.792 13.5238 255.798 17.5034C255.819 27.3926 255.781 37.2818 255.795 47.171C255.851 85.248 255.896 123.332 255.791 161.409C255.764 171.867 255.802 182.323 255.798 192.781C255.795 198.463 256.113 203.806 250.48 207.182C246.368 209.644 241.213 208.891 236.606 208.894C227.417 208.901 218.224 208.925 209.034 208.901C186.233 208.833 163.428 208.901 140.627 208.908C132.6 208.908 124.573 208.897 116.545 208.904C112.56 208.908 108.473 208.648 104.504 208.966Z";

const PEAK_MASK = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 257 209.999"><path fill="white" fill-rule="evenodd" d="${PEAK_PATH}"/></svg>`,
)}")`;

const goldFill: CSSProperties = {
  backgroundImage: "linear-gradient(90deg, #fcf8c5 0%, #f2c81d 50%, #ca8d0b 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  WebkitTextFillColor: "transparent",
};

function SharePeak() {
  const rawId = useId();
  const gradientId = `share-peak-${rawId.replace(/:/g, "")}`;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute top-[53px] left-[352px] h-[208px] w-[255px] overflow-clip"
    >
      <svg viewBox="0 0 257 209.999" className="absolute inset-0 size-full">
        <defs>
          <linearGradient
            id={gradientId}
            x1="1"
            y1="105"
            x2="256"
            y2="105"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#fcf8c5" />
            <stop offset="0.5" stopColor="#f2c81d" />
            <stop offset="1" stopColor="#ca8d0b" />
          </linearGradient>
        </defs>
        <path fill={`url(#${gradientId})`} fillRule="evenodd" d={PEAK_PATH} />
      </svg>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/textures/share-noise.png)",
          backgroundRepeat: "repeat",
          backgroundSize: "64px 64px",
          opacity: 0.28,
          WebkitMaskImage: PEAK_MASK,
          maskImage: PEAK_MASK,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
        }}
      />
    </div>
  );
}

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
      ? goldFill
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
      <div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-multiply">
        <div className="absolute inset-0 overflow-hidden opacity-38">
          <img
            alt=""
            src="/share/grid.png"
            width={448}
            height={446}
            draggable={false}
            className="absolute max-w-none"
            style={{
              width: "101.45%",
              height: "289.95%",
              left: "-1.39%",
              top: "-108.61%",
            }}
          />
        </div>
      </div>

      <SharePeak />

      <div className="relative flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2">
          <span className="relative inline-block h-[24.497px] w-[29.26px] shrink-0 overflow-clip">
            <BrandMark className="size-full" />
          </span>
          <p className="text-[20px] leading-none whitespace-nowrap">
            <span className="font-bold" style={goldFill}>
              elo
            </span>
            <span className="font-normal">vate</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[18px] leading-none text-[#d9d9d9]">{copy.modeLabel}</p>
          <p
            className="flex h-[26px] w-[76px] items-center justify-center rounded-[8px] border border-geebung-100 text-[18px] leading-none"
            style={goldFill}
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
