import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { requireAccountSettings } from "@/lib/profile/settings-queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Appearance",
};

export default async function AppearanceSettingsPage() {
  const settings = await requireAccountSettings("/settings/appearance");
  return <AppearanceSettings settings={settings} />;
}
