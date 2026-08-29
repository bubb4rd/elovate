import { NavAccount } from "@/components/nav-account";
import { NavNotifications } from "@/components/nav-notifications";
import { NavUserSearch } from "@/components/nav-user-search";
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
  tool?: "board" | "calc" | "friends";
}) {
  const viewer = await getViewerProfile();
  return (
    <div className="flex items-center gap-1">
      <NavUserSearch />
      {viewer ? <NavNotifications /> : null}
      <NavAccount
        viewer={viewer}
        loginNext={loginNext}
        boardHref={boardHref}
        calcHref={calcHref}
        tool={tool}
      />
    </div>
  );
}
