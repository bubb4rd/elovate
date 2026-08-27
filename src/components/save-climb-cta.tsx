import { UserPlus } from "@phosphor-icons/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { loginHref, registerHref } from "@/lib/auth/paths";

export function SaveClimbCta({ nextPath }: { nextPath: string }) {
  return (
    <section
      aria-label="Save your climb"
      className="rounded-[6px] border border-border bg-surface px-3.5 py-3"
    >
      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <UserPlus weight="bold" className="size-3.5 text-muted" aria-hidden />
        Save this session
      </p>
      <p className="mt-0.5 text-xs text-muted">
        Register or sign in to keep matches and teammates on every device.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={registerHref(nextPath)}>Register</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={loginHref(nextPath)}>Sign in</Link>
        </Button>
      </div>
    </section>
  );
}
