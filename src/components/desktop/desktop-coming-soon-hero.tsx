"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { DesktopWaitlistForm } from "@/components/desktop/desktop-waitlist-form";
import { ClimbSessionIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

function DesktopNavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium text-accent underline decoration-accent decoration-2 underline-offset-[5px]",
        "transition-opacity hover:opacity-80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      {children}
    </Link>
  );
}

export function DesktopComingSoonHero({
  initialEmail,
  userId,
}: {
  initialEmail: string | null;
  userId: string | null;
}) {
  const reduce = useReducedMotion();

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center justify-center px-4 py-16 md:px-6">
      <div className="w-full max-w-lg space-y-10">
        <div className="space-y-4 text-center">
          <motion.p
            className="flex flex-wrap items-center justify-center gap-2 text-2xl leading-none md:text-3xl"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.06, ease }}
          >
            <motion.span
              className="inline-flex"
              initial={reduce ? false : { opacity: 0, scale: 0.88, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease }}
            >
              <ClimbSessionIcon className="size-6 accent-glow md:size-7" />
            </motion.span>
            <span className="font-semibold tracking-tight">
              <span className="accent-glow bg-linear-to-r from-geebung-100 via-geebung-400 to-geebung-600 bg-clip-text text-transparent dark:from-geebung-100 dark:via-geebung-400 dark:to-geebung-500">
                elo
              </span>
              <span className="font-medium text-foreground">vate</span>
            </span>
            <span className="font-normal text-foreground">Desktop</span>
          </motion.p>

          <motion.p
            className="text-sm text-muted md:text-base"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease }}
          >
            Coming soon — a focused climb companion for the desktop. Join for updates
            and optional beta access.
          </motion.p>

          <motion.p
            className="flex flex-wrap items-center justify-center gap-4 text-sm"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.24, ease }}
          >
            <DesktopNavLink href="/">Home</DesktopNavLink>
            <DesktopNavLink href="/wz/calc">Climb</DesktopNavLink>
          </motion.p>
        </div>

        <DesktopWaitlistForm
          initialEmail={initialEmail}
          userId={userId}
          source="desktop_page"
        />
      </div>
    </main>
  );
}
