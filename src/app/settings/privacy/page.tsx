import { PrivacySettings } from "@/components/settings/privacy-settings";
import { requireAccountSettings } from "@/lib/profile/settings-queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
};

export default async function PrivacySettingsPage() {
  const settings = await requireAccountSettings("/settings/privacy");
  return <PrivacySettings settings={settings} />;
}
