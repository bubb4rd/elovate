import { ClimbMark } from "@/components/icons";
import { ElovateWordmark } from "@/components/elovate-wordmark";
import { IRIDESCENT_GRADIENT } from "@/lib/profile/themes";
import { headerDef, type ProfileHeaderId } from "@/lib/profile/headers";
import { cn } from "@/lib/utils";

const BANNER_BG: Record<ProfileHeaderId, string> = {
  default: "linear-gradient(90deg, rgb(112 112 112 / 0) 0%, #454545 100%)",
  platinum: "linear-gradient(90deg, #73fffa 0%, #1df2b2 50%, #0bca8a 100%)",
  diamond: "linear-gradient(90deg, #7373ff 0%, #241df2 50%, #180bca 100%)",
  crimson: "linear-gradient(90deg, #ff7375 0%, #f21d21 50%, #ca0b0e 100%)",
  iridescent: IRIDESCENT_GRADIENT,
  "elovate-staff":
    "linear-gradient(90deg, var(--geebung-100) 0%, var(--geebung-400) 50%, var(--geebung-600) 100%)",
};

function inkClass(ink: "black" | "white"): string {
  return ink === "black" ? "text-[#0a0a0b]" : "text-white";
}

export function ProfileBanner({
  headerId,
  className,
  variant = "full",
}: {
  headerId: ProfileHeaderId;
  className?: string;
  /** Picker thumbnails — art/gradient only, no wordmarks or rank labels. */
  variant?: "full" | "preview";
}) {
  const header = headerDef(headerId);
  const ink = inkClass(header.ink);
  const showChrome = variant === "full";

  return (
    <div
      className={cn(
        "relative h-[200px] w-full overflow-hidden rounded-2xl [container-type:size]",
        headerId === "default" && "bg-[#292929]",
        className,
      )}
      style={{ backgroundImage: BANNER_BG[headerId] }}
    >
      {headerId === "default" ? <DefaultPeaks /> : null}

      {headerId === "elovate-staff" ? (
        <>
          <ClimbMark
            className={cn(
              "pointer-events-none absolute top-[18.5%] left-1/2 h-[63%] w-auto -translate-x-1/2",
              ink,
            )}
          />
          {showChrome ? (
            <ElovateWordmark
              className={cn("pointer-events-none absolute right-[2.9%] bottom-[10%]", ink)}
              sizeClassName="text-[15cqh]"
            />
          ) : null}
        </>
      ) : null}

      {header.kind === "rank" && showChrome ? (
        <>
          <div className={cn("pointer-events-none absolute top-[12%] left-[2.9%] flex items-center gap-[0.8cqh]", ink)}>
            <ClimbMark className="h-[23cqh] w-auto" />
            <ElovateWordmark sizeClassName="text-[15cqh]" />
          </div>
          <p className={cn("pointer-events-none absolute right-[2.9%] bottom-[10%] text-[16cqh] font-bold leading-none", ink)}>
            {header.label}
          </p>
        </>
      ) : null}

      {headerId === "default" && showChrome ? (
        <div className={cn("pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-[0.8cqh]", ink)}>
          <ClimbMark className="h-[23cqh] w-auto" />
          <ElovateWordmark sizeClassName="text-[15cqh]" />
        </div>
      ) : null}
    </div>
  );
}

function DefaultPeaks() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <img
        alt=""
        src="/profile/headers/default-peak-gold.svg"
        className="absolute max-w-none"
        style={{ left: "4.63%", top: "18.5%", width: "22.5%", height: "128.5%" }}
        draggable={false}
      />
      <img
        alt=""
        src="/profile/headers/default-peak-outline-left.svg"
        className="absolute max-w-none"
        style={{ left: "8.01%", top: "6.5%", width: "22.79%", height: "130.5%" }}
        draggable={false}
      />
      <img
        alt=""
        src="/profile/headers/default-peak-teal.svg"
        className="absolute max-w-none"
        style={{ left: "57.65%", top: "-66%", width: "40.66%", height: "232.5%" }}
        draggable={false}
      />
      <img
        alt=""
        src="/profile/headers/default-peak-outline-right.svg"
        className="absolute max-w-none"
        style={{ left: "90.22%", top: "-64%", width: "22.5%", height: "128.5%" }}
        draggable={false}
      />
    </div>
  );
}
