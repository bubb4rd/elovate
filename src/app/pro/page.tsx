import { redirect } from "next/navigation";
import { ProPricing } from "@/components/premium/pro-pricing";
import { getViewerProfile } from "@/lib/auth/viewer";

export default async function ProPage() {
  const viewer = await getViewerProfile();
  if (viewer?.isPro) redirect("/pro/teammates");
  return <ProPricing signedIn={viewer != null} />;
}
