import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { LoginForm } from "@/components/auth/login-form";
import { postAuthPath, safeNextPath } from "@/lib/auth/paths";
import { getViewerProfile } from "@/lib/auth/viewer";
import { listSeasons } from "@/lib/data/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/");
  const viewer = await getViewerProfile();
  if (viewer) {
    redirect(
      postAuthPath({
        onboardingComplete: viewer.onboardingComplete,
        slug: viewer.slug || undefined,
        next,
      }),
    );
  }
  const seasons = listSeasons();

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteNav seasons={seasons} />
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-4 py-12">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted">
            Use a one-time email code or Discord. Same account can hold both.
          </p>
          {isSupabaseConfigured() ? (
            <LoginForm nextPath={params.next} errorCode={params.error} />
          ) : (
            <p className="mt-6 text-sm text-muted">Sign-in is not configured on this server.</p>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
