import { AccountSettingsPanel } from "@/components/settings/account-settings";
import { requireAccountSettings } from "@/lib/profile/settings-queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account",
};

export default async function AccountSettingsPage() {
  const settings = await requireAccountSettings("/settings/account");
  return <AccountSettingsPanel settings={settings} />;
}
