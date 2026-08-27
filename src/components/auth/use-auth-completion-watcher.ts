"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { subscribeAuthComplete } from "@/lib/auth/cross-tab-auth";
import { destinationAfterSession } from "@/lib/auth/post-auth";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

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

    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    async function complete(fromBroadcastNext?: string) {
      if (completingRef.current) return;
      completingRef.current = true;
      setCompleting(true);

      const path =
        fromBroadcastNext ??
        (await destinationAfterSession(supabase!, next));

      router.replace(path);
      router.refresh();
    }

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await complete();
      }
    }

    void checkSession();

    const unsubscribe = subscribeAuthComplete((broadcastNext) => {
      void complete(broadcastNext);
    });

    const interval = window.setInterval(() => {
      void checkSession();
    }, POLL_MS);

    function onFocus() {
      void checkSession();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void checkSession();
      }
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
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
