import type { Metadata } from "next";
import { TrendProjectionSection } from "@/components/premium/trend-projection-section";
import { requireProPage } from "@/lib/premium/queries";
import { isTrendWindowId } from "@/lib/premium/trend-projection";

export const metadata: Metadata = {
  title: "Trend",
};

export default async function ProTrendPage(props: PageProps<"/pro/trend">) {
  await requireProPage();
  // `?w=` carries the pace window so the control survives tab switches, back,
  // and shared links.
  const { w } = await props.searchParams;
  const initialWindow = isTrendWindowId(w) ? w : "7d";
  return <TrendProjectionSection initialWindow={initialWindow} />;
}
