import type { Metadata } from "next";
import { TrendProjectionSection } from "@/components/premium/trend-projection-section";
import { requireProPage } from "@/lib/premium/queries";

export const metadata: Metadata = {
  title: "Trend",
};

export default async function ProTrendPage() {
  await requireProPage();
  return <TrendProjectionSection />;
}
