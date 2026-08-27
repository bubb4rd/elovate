import { NavAccount } from "@/components/nav-account";
import { getViewerProfile } from "@/lib/auth/viewer";

export async function NavSession({ loginNext = "/" }: { loginNext?: string }) {
  const viewer = await getViewerProfile();
  return <NavAccount viewer={viewer} loginNext={loginNext} />;
}
