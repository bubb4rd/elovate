"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { saveAccountSettings, type SettingsPatch } from "@/lib/profile/settings";

export function useSettingsPatch(userId: string) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const patch = useCallback(
    async (update: SettingsPatch) => {
      setSaving(true);
      setError(null);
      setMessage(null);
      const result = await saveAccountSettings(userId, update);
      setSaving(false);
      if ("error" in result) {
        setError(result.error);
        return false;
      }
      router.refresh();
      return true;
    },
    [router, userId],
  );

  return { saving, message, error, setMessage, setError, patch };
}
