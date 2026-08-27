"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LinkedAccounts } from "@/components/profile/linked-accounts";
import {
  SettingsRow,
  SettingsSection,
  SettingsToggle,
} from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatSnapshotTime } from "@/lib/format";
import type { AccountSettings } from "@/lib/profile/settings";
import { saveAccountSettings } from "@/lib/profile/settings";
import { DISPLAY_NAME_MAX_LEN } from "@/lib/profile/slug";

export function SettingsContent({ settings }: { settings: AccountSettings }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(settings.displayName);
  const [isPrivate, setIsPrivate] = useState(settings.isPrivate);
  const [notifyCutoff, setNotifyCutoff] = useState(settings.notifyCutoff);
  const [notifyClimb, setNotifyClimb] = useState(settings.notifyClimb);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nameDirty = displayName.trim() !== settings.displayName;

  async function patch(field: string, update: Parameters<typeof saveAccountSettings>[1]) {
    setSaving(field);
    setError(null);
    setMessage(null);
    const result = await saveAccountSettings(settings.userId, update);
    setSaving(null);
    if ("error" in result) {
      setError(result.error);
      return false;
    }
    router.refresh();
    return true;
  }

  async function saveDisplayName() {
    const ok = await patch("name", { displayName });
    if (ok) setMessage("Display name updated.");
  }

  async function togglePrivate(next: boolean) {
    setIsPrivate(next);
    const ok = await patch("private", { isPrivate: next });
    if (!ok) setIsPrivate(!next);
  }

  async function toggleNotifyCutoff(next: boolean) {
    setNotifyCutoff(next);
    const ok = await patch("notify-cutoff", { notifyCutoff: next });
    if (!ok) setNotifyCutoff(!next);
  }

  async function toggleNotifyClimb(next: boolean) {
    setNotifyClimb(next);
    const ok = await patch("notify-climb", { notifyClimb: next });
    if (!ok) setNotifyClimb(!next);
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Account"
        description="Your public identity on elovate."
      >
        <SettingsRow label="Display name" hint="Shown on your profile and in the nav.">
          <div className="flex w-full flex-col gap-2 sm:w-64">
            <Input
              value={displayName}
              maxLength={DISPLAY_NAME_MAX_LEN}
              disabled={saving === "name"}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setMessage(null);
                setError(null);
              }}
            />
            {nameDirty ? (
              <Button
                type="button"
                size="sm"
                disabled={saving === "name"}
                onClick={() => {
                  void saveDisplayName();
                }}
              >
                {saving === "name" ? "Saving…" : "Save name"}
              </Button>
            ) : null}
          </div>
        </SettingsRow>
        <SettingsRow label="Username" hint="Your profile URL. Contact support to change.">
          <span className="text-sm font-medium text-muted">@{settings.slug}</span>
        </SettingsRow>
        <SettingsRow label="Email" hint="Used for sign-in and notifications.">
          <span className="text-sm text-muted">{settings.email ?? "Not set"}</span>
        </SettingsRow>
        <SettingsRow label="Member since">
          <span className="text-sm text-muted">
            {settings.createdAt ? formatSnapshotTime(settings.createdAt) : "—"}
          </span>
        </SettingsRow>
        <SettingsRow label="Profile">
          <Link
            href={`/players/${settings.slug}`}
            className="text-sm font-medium text-accent hover:underline"
          >
            View public profile
          </Link>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Privacy"
        description="Control who can see your climb history and stats."
      >
        <SettingsRow
          label="Private profile"
          hint="When on, only you can view your profile page."
        >
          <SettingsToggle
            label="Private profile"
            checked={isPrivate}
            disabled={saving === "private"}
            onChange={(next) => {
              void togglePrivate(next);
            }}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        description="Email alerts for your account. More channels coming soon."
      >
        <SettingsRow
          label="Cutoff updates"
          hint="When the live T250 cutoff moves significantly."
        >
          <SettingsToggle
            label="Cutoff updates"
            checked={notifyCutoff}
            disabled={!settings.email || saving === "notify-cutoff"}
            onChange={(next) => {
              void toggleNotifyCutoff(next);
            }}
          />
        </SettingsRow>
        <SettingsRow
          label="Climb reminders"
          hint="Periodic nudges based on your climb goals."
        >
          <SettingsToggle
            label="Climb reminders"
            checked={notifyClimb}
            disabled={!settings.email || saving === "notify-climb"}
            onChange={(next) => {
              void toggleNotifyClimb(next);
            }}
          />
        </SettingsRow>
        {!settings.email ? (
          <div className="px-4 py-3 text-sm text-muted md:px-5">
            Link an email under Linked accounts to enable notifications.
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Linked accounts"
        description="Connect email and Discord to the same elovate account."
      >
        <div className="px-4 py-4 md:px-5">
          <LinkedAccounts nextPath="/settings" surface="default" />
        </div>
      </SettingsSection>

      {message ? <p className="text-sm text-muted">{message}</p> : null}
      {error ? <p className="text-sm text-negative">{error}</p> : null}
    </div>
  );
}
