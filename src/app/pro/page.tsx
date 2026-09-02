import { redirect } from "next/navigation";
import { ProPricing } from "@/components/premium/pro-pricing";
import { getViewerEntitlement } from "@/lib/premium/queries";

export default async function ProPage() {
  const { isPro } = await getViewerEntitlement();
  if (isPro) redirect("/pro/teammates");
  return <ProPricing />;
}
