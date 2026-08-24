import { CalcPage } from "@/components/calc-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MP climb calculator",
};

export default function MultiplayerCalc() {
  return <CalcPage mode="mp" />;
}
