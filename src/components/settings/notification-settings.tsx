"use client";

import { Bell, ChartLineUp } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import {
  SettingsRow,
  SettingsSection,
  SettingsStatus,
  SettingsToggle,
} from "@/components/settings/settings-section";
import { useSettingsPatch } from "@/components/settings/use-settings-patch";
import type { AccountSettings } from "@/lib/profile/settings";

export function NotificationSettings({ settings }: { settings: AccountSettings }) {
  const { saving, message, error, setMessage, patch } = useSettingsPatch(settings.userId);
  const [notifyCutoff, setNotifyCutoff] = useState(settings.notifyCutoff);
  const [notifyClimb, setNotifyClimb] = useState(settings.notifyClimb);

  async function toggleNotifyCutoff(next: boolean) {
    const previous = notifyCutoff;
    setNotifyCutoff(next);
    const ok = await patch({ notifyCutoff: next });
    if (!ok) {
      setNotifyCutoff(previous);
      return;
    }
    setMessage("Notifications updated.");
  }

  async function toggleNotifyClimb(next: boolean) {
    const previous = notifyClimb;
    setNotifyClimb(next);
    const ok = await patch({ notifyClimb: next });
    if (!ok) {
      setNotifyClimb(previous);
      return;
    }
    setMessage("Notifications updated.");
  }

  return (
    <div className="space-y-6">
      <SettingsSection description="Email alerts for your account. More channels coming soon.">
        <SettingsRow
          icon={<ChartLineUp weight="bold" className="size-4" aria-hidden />}
          label="Cutoff updates"
          hint="When the live T250 cutoff moves significantly."
        >
          <SettingsToggle
            label="Cutoff updates"
            checked={notifyCutoff}
            disabled={!settings.email || saving}
            onChange={(next) => {
              void toggleNotifyCutoff(next);
            }}
          />
        </SettingsRow>
        <SettingsRow
          icon={<Bell weight="bold" className="size-4" aria-hidden />}
          label="Climb reminders"
          hint="Periodic nudges based on your climb goals."
        >
          <SettingsToggle
            label="Climb reminders"
            checked={notifyClimb}
            disabled={!settings.email || saving}
            onChange={(next) => {
              void toggleNotifyClimb(next);
            }}
          />
        </SettingsRow>
        {!settings.email ? (
          <div className="px-4 py-3 text-sm text-muted md:px-5">
            Link an email under{" "}
            <Link href="/settings/account" className="font-medium text-accent hover:underline">
              Account
            </Link>{" "}
            to enable notifications.
          </div>
        ) : null}
      </SettingsSection>
      <SettingsStatus message={message} error={error} />
    </div>
  );
}
