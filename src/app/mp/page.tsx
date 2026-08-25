import { MpComingSoon } from "@/components/mp-coming-soon";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Multiplayer",
};

export default function MultiplayerBoard() {
  return <MpComingSoon />;
}
