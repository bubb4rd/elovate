import { CalcPage } from "@/components/calc-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MP Climb",
};

export default function MultiplayerCalc() {
  return <CalcPage mode="mp" />;
}
