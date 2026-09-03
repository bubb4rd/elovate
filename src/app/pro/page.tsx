import { redirect } from "next/navigation";
import { ProFeatureShowcase } from "@/components/premium/pro-feature-showcase";
import { ProPricing } from "@/components/premium/pro-pricing";
import { getViewerProfile } from "@/lib/auth/viewer";

export default async function ProPage() {
  const viewer = await getViewerProfile();
  if (viewer?.isPro) redirect("/pro/teammates");
  return (
    <div className="space-y-12">
      <ProFeatureShowcase />
      <ProPricing signedIn={viewer != null} />
    </div>
  );
}
