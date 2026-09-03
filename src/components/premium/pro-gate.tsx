import Link from "next/link";
import type { ReactNode } from "react";
import { getViewerEntitlement } from "@/lib/premium/queries";
import { cn } from "@/lib/utils";

/**
 * elovate Pro paywall (PREM-00).
 *
 * Wrap Pro-only content. For a signed-in Pro viewer the children render as-is;
 * otherwise the `teaser` renders blurred behind an upsell overlay.
 *
 *   <ProGate
 *     insight="You're +14 SR/game with your top duo — see the full breakdown."
 *     teaser={<TeammateBreakdownChart data={preview} />}
 *   >
 *     <TeammateBreakdownChart data={full} />
 *   </ProGate>
 *
 * Rules for feature authors:
 * - `teaser` must be a real, rendered preview computed from the user's own data —
 *   never an empty box or a bare lock. A blurred real chart converts; a padlock
 *   does not (PREMIUM-FEATURES-DRAFT §1.4, §5).
 * - `insight` is one computed sentence that proves the feature is worth it.
 * - Server Component. For client subtrees use `usePro()` from
 *   `@/lib/premium/premium-context`.
 */
export async function ProGate({
  children,
  teaser,
  insight,
  title = "An elovate Pro insight",
  upsellHref = "/pro",
  className,
}: {
  children: ReactNode;
  teaser: ReactNode;
  insight?: string;
  title?: string;
  upsellHref?: string;
  className?: string;
}) {
  const { isPro } = await getViewerEntitlement();
  if (isPro) return <>{children}</>;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[8px] border border-border",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none select-none blur-[6px]">
        {teaser}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/70 p-6 text-center backdrop-blur-[2px]">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
          {title}
        </p>
        {insight ? (
          <p className="max-w-sm text-sm text-foreground">{insight}</p>
        ) : null}
        <Link
          href={upsellHref}
          className={cn(
            "mt-1 rounded-[6px] border border-border bg-surface-elevated px-3 py-1.5",
            "text-xs font-medium tracking-wide text-foreground hover:bg-surface",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          )}
        >
          Unlock with Pro
        </Link>
      </div>
    </div>
  );
}
