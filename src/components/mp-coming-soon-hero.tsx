"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { ClimbSessionIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const ease = [0.16, 1, 0.3, 1] as const;

function MpNavLink({ href, children }: { href: string; children: ReactNode }) {
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

export function MpComingSoonHero() {
  const reduce = useReducedMotion();

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center justify-center px-4 py-16 md:px-6">
      <div className="space-y-3 text-center">
        <motion.p
          className="flex flex-wrap items-center justify-center gap-2 text-lg leading-none md:text-xl"
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
            <ClimbSessionIcon className="size-5 accent-glow md:size-6" />
          </motion.span>
          <span className="font-semibold tracking-tight">
            <span className="accent-glow bg-linear-to-r from-geebung-100 via-geebung-400 to-geebung-600 bg-clip-text text-transparent dark:from-geebung-100 dark:via-geebung-400 dark:to-geebung-500">
              elo
            </span>
            <span className="font-medium text-foreground">vate</span>
          </span>
          <span className="font-normal text-foreground">Multiplayer</span>
        </motion.p>
        <motion.p
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22, ease }}
        >
          <motion.span
            className="text-muted"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.28, ease }}
          >
            Coming soon.
          </motion.span>
          <span className="flex items-center gap-4">
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.34, ease }}
            >
              <MpNavLink href="/">Home</MpNavLink>
            </motion.span>
            <motion.span
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.4, ease }}
            >
              <MpNavLink href="/wz/calc">Climb</MpNavLink>
            </motion.span>
          </span>
        </motion.p>
      </div>
    </main>
  );
}
