"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { subscribeAuthComplete } from "@/lib/auth/cross-tab-auth";
import { destinationAfterSession } from "@/lib/auth/post-auth";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database";

const POLL_MS = 1500;

export type AuthCompletionPhase = "waiting" | "completing";

export function useAuthCompletionWatcher({
  enabled,
  next,
}: {
  enabled: boolean;
  next: string;
}) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);
  const completingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      completingRef.current = false;
      return;
    }

    const maybeClient = createBrowserSupabaseClient();
    if (!maybeClient) return;

    const supabase: SupabaseClient<Database> = maybeClient;
    let cancelled = false;

    const complete = async (fromBroadcastNext?: string) => {
      if (cancelled || completingRef.current) return;
      completingRef.current = true;
      setCompleting(true);

      const path =
        fromBroadcastNext ?? (await destinationAfterSession(supabase, next));

      router.replace(path);
      router.refresh();
    };

    const checkSession = async () => {
      if (cancelled) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await complete();
      }
    };

    void checkSession();

    const unsubscribe = subscribeAuthComplete((broadcastNext) => {
      void complete(broadcastNext);
    });

    const interval = window.setInterval(() => {
      void checkSession();
    }, POLL_MS);

    const onFocus = () => {
      void checkSession();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      completingRef.current = false;
    };
  }, [enabled, next, router]);

  if (!enabled) return "waiting";
  return completing ? "completing" : "waiting";
}
