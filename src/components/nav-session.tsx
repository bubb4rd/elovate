import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { NavAccount } from "@/components/nav-account";
import { NavNotifications } from "@/components/nav-notifications";
import { getViewerProfile } from "@/lib/auth/viewer";

export async function NavSession({
  loginNext = "/",
  boardHref,
  calcHref,
  tool,
}: {
  loginNext?: string;
  boardHref: string;
  calcHref: string;
  tool?: "board" | "calc";
}) {
  const viewer = await getViewerProfile();
  return (
    <div className="flex items-center gap-1">
      <MobileNavMenu
        boardHref={boardHref}
        calcHref={calcHref}
        tool={tool}
        loginNext={loginNext}
        signedIn={Boolean(viewer)}
      />
      {viewer ? <NavNotifications /> : null}
      <NavAccount viewer={viewer} loginNext={loginNext} />
    </div>
  );
}
