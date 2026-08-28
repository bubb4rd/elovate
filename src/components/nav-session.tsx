import { NavAccount } from "@/components/nav-account";
import { NavNotifications } from "@/components/nav-notifications";
import { getViewerProfile } from "@/lib/auth/viewer";

export async function NavSession({ loginNext = "/" }: { loginNext?: string }) {
  const viewer = await getViewerProfile();
  return (
    <div className="flex items-center gap-1">
      {viewer ? <NavNotifications /> : null}
      <NavAccount viewer={viewer} loginNext={loginNext} />
    </div>
  );
}
