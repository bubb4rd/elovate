"use client";

import { AppleLogo, WindowsLogo } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { DesktopWaitlistForm } from "@/components/desktop/desktop-waitlist-form";
import { ClimbSessionIcon } from "@/components/icons";

const ease = [0.16, 1, 0.3, 1] as const;

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
        <div className="space-y-5 text-center">
          <motion.div
            className="flex flex-wrap items-end justify-center gap-x-2 gap-y-3 text-2xl leading-none md:gap-x-2.5 md:text-3xl"
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.06, ease }}
          >
            <motion.span
              className="inline-flex self-center"
              initial={reduce ? false : { opacity: 0, scale: 0.88, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease }}
            >
              <ClimbSessionIcon className="size-6 accent-glow md:size-7" />
            </motion.span>
            <span className="self-center font-semibold tracking-tight">
              <span className="accent-glow bg-linear-to-r from-geebung-100 via-geebung-400 to-geebung-600 bg-clip-text text-transparent dark:from-geebung-100 dark:via-geebung-400 dark:to-geebung-500">
                elo
              </span>
              <span className="font-medium text-foreground">vate</span>
            </span>
            <span className="relative inline-block self-center pb-1 font-normal text-foreground">
              Desktop
              <motion.span
                className="pointer-events-none absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 rotate-[-4deg] whitespace-nowrap bg-accent px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.18em] text-accent-fg shadow-[2px_3px_0_color-mix(in_oklab,var(--foreground)_18%,transparent)] md:-bottom-0.5 md:px-2 md:text-[0.62rem]"
                initial={reduce ? false : { opacity: 0, scale: 0.85, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: -4 }}
                transition={{ duration: 0.45, delay: 0.28, ease }}
              >
                Coming soon
              </motion.span>
            </span>
            <span className="mb-0.5 ml-1 inline-flex self-center items-center gap-2 text-muted">
              <WindowsLogo weight="fill" className="size-4 md:size-5" aria-label="Windows" />
              <AppleLogo weight="fill" className="size-4 md:size-5" aria-label="macOS" />
            </span>
          </motion.div>

          <motion.p
            className="mx-auto max-w-md pt-3 text-sm text-muted md:text-base"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.26, ease }}
          >
            A focused climb companion for the desktop. Join for updates and optional
            beta access.
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
