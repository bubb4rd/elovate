import { redirect } from "next/navigation";
import { SettingsContent } from "@/components/settings/settings-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { loginHref, onboardingHref } from "@/lib/auth/paths";
import { getViewerProfile } from "@/lib/auth/viewer";
import { listSeasons } from "@/lib/data/queries";
import { getAccountSettings } from "@/lib/profile/settings-queries";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const viewer = await getViewerProfile();
  if (!viewer) {
    redirect(loginHref("/settings"));
  }
  if (!viewer.onboardingComplete) {
    redirect(onboardingHref("/settings"));
  }

  const settings = await getAccountSettings(viewer.id);
  if (!settings) {
    redirect(onboardingHref("/settings"));
  }

  const seasons = listSeasons();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav seasons={seasons} loginNext="/settings" />
      <main className="mx-auto w-full max-w-[640px] flex-1 px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 text-sm text-muted">
            Account, privacy, notifications, and linked sign-in methods.
          </p>
        </div>
        <SettingsContent settings={settings} />
      </main>
      <SiteFooter />
    </div>
  );
}
