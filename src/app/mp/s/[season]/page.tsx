import { TrackerPage } from "@/components/tracker-page";
import { getSeason } from "@/lib/data/queries";
import { notFound } from "next/navigation";

export default async function MultiplayerSeasonBoard({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  if (!getSeason(season)) notFound();
  return <TrackerPage mode="mp" seasonId={season} />;
}
