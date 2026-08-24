import { TrackerPage } from "@/components/tracker-page";
import { getActiveSeason } from "@/lib/data/queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Multiplayer",
};

export default function MultiplayerBoard() {
  const season = getActiveSeason();
  return <TrackerPage mode="mp" seasonId={season.id} />;
}
