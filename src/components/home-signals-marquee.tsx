import { FREE_SIGNALS, PRO_SIGNALS } from "@/lib/home/pro-preview";
import { SignalRail } from "./home-signal-rail";

/**
 * Homepage signal marquee — sits between the cutoff hero and the Pro CTA so the
 * page alternates split -> marquee -> split. Two rails drifting opposite ways so
 * Free vs Pro is felt, not cordoned off with accent chrome. One marquee module
 * per page.
 */
export function HomeSignalsMarquee() {
  return (
    <section
      aria-label="elovate Free and Pro signals"
      className="overflow-hidden border-t border-border py-14 md:py-20"
    >
      <div className="mx-auto max-w-[1400px] px-4 text-center">
        <p className="text-accent text-xs font-medium uppercase tracking-[0.16em]">
          Every signal
        </p>
        <p className="mx-auto mt-2 max-w-prose text-base text-muted">
          Free tracks where you stand. Pro tells you what to do about it.
        </p>
      </div>

      <div className="mt-10 flex flex-col gap-4">
        <SignalRail
          id="home-free-signals"
          signals={FREE_SIGNALS}
          direction="left"
          railLabel="Free signals"
        />
        <SignalRail
          id="home-pro-signals"
          signals={PRO_SIGNALS}
          direction="right"
          railLabel="Pro signals"
        />
      </div>
    </section>
  );
}
