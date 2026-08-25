import { TrackerPage } from "@/components/tracker-page";
import { getActiveSeason } from "@/lib/data/queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Warzone",
};

export const revalidate = 900;

export default function WarzoneBoard() {
  const season = getActiveSeason();
  return <TrackerPage mode="wz" seasonId={season.id} />;
}
