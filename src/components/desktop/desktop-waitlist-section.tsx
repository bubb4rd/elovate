"use client";

import { motion, useReducedMotion } from "motion/react";
import { DesktopWaitlistForm } from "@/components/desktop/desktop-waitlist-form";

const ease = [0.16, 1, 0.3, 1] as const;

export function DesktopWaitlistSection({
  initialEmail,
  userId,
}: {
  initialEmail: string | null;
  userId: string | null;
}) {
  const reduce = useReducedMotion();

  return (
    <section
      id="waitlist"
      className="scroll-mt-24 px-4 py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto grid w-full max-w-[1400px] gap-12 md:grid-cols-[1fr_minmax(0,28rem)] md:items-start md:gap-16">
        <motion.div
          className="max-w-lg space-y-4"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55, ease }}
        >
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">
            Waitlist
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Get updates. Opt into beta.
          </h2>
          <p className="text-base leading-relaxed text-muted">
            Leave your email for Desktop news. Toggle beta if you want a shot at early
            builds when seats open.
          </p>
        </motion.div>

        <DesktopWaitlistForm initialEmail={initialEmail} userId={userId} />
      </div>
    </section>
  );
}
