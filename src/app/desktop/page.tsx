import { DesktopComingSoon } from "@/components/desktop/desktop-coming-soon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Desktop",
  description: "elovate Desktop is coming soon. Join the waitlist for updates and beta access.",
};

export default async function DesktopPage() {
  const supabase = await createServerSupabaseClient();
  let initialEmail: string | null = null;
  let userId: string | null = null;

  if (supabase) {
    const { data } = await supabase.auth.getUser();
    initialEmail = data.user?.email ?? null;
    userId = data.user?.id ?? null;
  }

  return <DesktopComingSoon initialEmail={initialEmail} userId={userId} />;
}
