"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { broadcastAuthComplete } from "@/lib/auth/cross-tab-auth";
import { safeNextPath } from "@/lib/auth/paths";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const REDIRECT_MS = 800;

function AuthCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), "/");
  const [status, setStatus] = useState<"checking" | "ready" | "error">("checking");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void (async () => {
      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        router.replace("/login?error=config");
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setStatus("error");
        router.replace("/login?error=auth");
        return;
      }

      broadcastAuthComplete(next);
      setStatus("ready");

      window.setTimeout(() => {
        router.replace(next);
        router.refresh();
      }, REDIRECT_MS);
    })();
  }, [next, router]);

  if (status === "error") {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center px-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-surface-elevated text-accent">
        <CheckCircle weight="fill" className="size-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">
        {status === "checking" ? "Confirming sign-in…" : "You're signed in"}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {status === "checking"
          ? "One moment while we finish up."
          : "Returning to elovate. You can close this tab if another window is already open."}
      </p>
    </div>
  );
}

export default function AuthCompletePage() {
  return (
    <Suspense fallback={null}>
      <AuthCompleteContent />
    </Suspense>
  );
}
