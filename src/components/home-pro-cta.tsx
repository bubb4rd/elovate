import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProInsightFeed } from "./pro-insight-feed";

/**
 * Homepage Pro CTA — one close for the page. A grinder headline the marquee
 * cannot say, one sentence of what Pro is, one button, and the insight feed on
 * the right.
 *
 * Billing is not built (PREM-00 is entitlement only), so the button points at
 * the `/pro` landing page rather than a checkout. Swap the label to "Join Pro"
 * once Stripe is live.
 */
export function HomeProCta() {
  return (
    <section id="pro" className="border-t border-border">
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-8 md:py-20">
        <div>
          <p className="text-sm font-medium text-muted">
            elovate <span className="text-accent">Pro</span>
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
            Know who to queue with.
          </h2>
          <p className="mt-4 max-w-md text-base text-muted">
            Teammate splits, placement efficiency, and a projected date for each
            goal, on the matches you already log.
          </p>
          <Button asChild className="mt-8">
            <Link href="/pro">Explore Pro</Link>
          </Button>
        </div>

        <ProInsightFeed />
      </div>
    </section>
  );
}
