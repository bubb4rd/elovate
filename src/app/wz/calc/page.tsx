import { CalcPage } from "@/components/calc-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WZ Climb",
};

export default function WarzoneCalc() {
  return <CalcPage mode="wz" />;
}
