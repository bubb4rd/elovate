import { TrackerPage } from "@/components/tracker-page";
import { getActiveSeason } from "@/lib/data/queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Warzone",
};

export default function WarzoneBoard() {
  const season = getActiveSeason();
  return <TrackerPage mode="wz" seasonId={season.id} />;
}
