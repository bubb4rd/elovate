import type { Metadata } from "next";
import { TeammateBreakdownSection } from "@/components/premium/teammate-breakdown-section";
import { requireProPage } from "@/lib/premium/queries";

export const metadata: Metadata = {
  title: "Teammates",
};

export default async function ProTeammatesPage() {
  await requireProPage("/pro/teammates");
  return <TeammateBreakdownSection />;
}
