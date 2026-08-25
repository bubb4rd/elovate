import { CalcPage } from "@/components/calc-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WZ Climb",
};

export const revalidate = 900;

export default function WarzoneCalc() {
  return <CalcPage mode="wz" />;
}
