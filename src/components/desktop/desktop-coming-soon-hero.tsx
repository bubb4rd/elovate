"use client";

import { AppleLogo, WindowsLogo } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { ClimbSessionIcon } from "@/components/icons";

const ease = [0.16, 1, 0.3, 1] as const;

export function DesktopComingSoonHero() {
  const reduce = useReducedMotion();

  return (
    <section className="flex flex-col justify-center border-b border-border px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="mx-auto max-w-2xl space-y-7 text-center">
          <motion.div
            className="flex flex-wrap items-end justify-center gap-x-2 gap-y-3 text-3xl leading-none md:gap-x-3 md:text-4xl"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.06, ease }}
          >
            <motion.span
              className="inline-flex self-center"
              initial={reduce ? false : { opacity: 0, scale: 0.88, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease }}
            >
              <ClimbSessionIcon className="size-7 accent-glow md:size-8" />
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
                className="pointer-events-none absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 rotate-[-4deg] whitespace-nowrap bg-accent px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.18em] text-accent-fg shadow-[2px_3px_0_color-mix(in_oklab,var(--foreground)_18%,transparent)] md:-bottom-0.5 md:px-2 md:text-[0.68rem]"
                initial={reduce ? false : { opacity: 0, scale: 0.85, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: -4 }}
                transition={{ duration: 0.45, delay: 0.28, ease }}
              >
                Coming soon
              </motion.span>
            </span>
            <span className="mb-1 ml-1 inline-flex self-center items-center gap-2.5 text-muted">
              <WindowsLogo weight="fill" className="size-5 md:size-6" aria-label="Windows" />
              <AppleLogo weight="fill" className="size-5 md:size-6" aria-label="macOS" />
            </span>
          </motion.div>

          <motion.p
            className="mx-auto max-w-md text-base leading-relaxed text-muted"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.22, ease }}
          >
            A focused climb companion for the desktop. Join for updates and optional beta
            access.
          </motion.p>

          <motion.div
            className="flex flex-wrap items-center justify-center gap-4 pt-1"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.34, ease }}
          >
            <a
              href="#waitlist"
              className="inline-flex h-11 items-center justify-center rounded-[6px] bg-accent px-5 text-sm font-medium text-accent-fg shadow-sm transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
            >
              Join the waitlist
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
