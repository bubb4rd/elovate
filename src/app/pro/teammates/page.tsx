import type { Metadata } from "next";
import { TeammateBreakdownSection } from "@/components/premium/teammate-breakdown-section";
import { requireProPage } from "@/lib/premium/queries";

export const metadata: Metadata = {
  title: "Teammates",
};

export default async function ProTeammatesPage() {
  await requireProPage();
  return (
    <div className="mt-6 space-y-5">
      {/* Plain product h1, matching /pro/trend — the Pro shell no longer owns
          a heading, so each feature page carries its own. */}
      <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-semibold tracking-tight">
        <span className="text-2xl md:text-4xl">Teammates</span>
        <span className="text-lg text-muted md:text-2xl">Warzone</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
          Pro
        </span>
      </h1>
      <TeammateBreakdownSection />
    </div>
  );
}
