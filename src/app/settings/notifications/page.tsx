import { NotificationSettings } from "@/components/settings/notification-settings";
import { requireAccountSettings } from "@/lib/profile/settings-queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
};

export default async function NotificationSettingsPage() {
  const settings = await requireAccountSettings("/settings/notifications");
  return <NotificationSettings settings={settings} />;
}
