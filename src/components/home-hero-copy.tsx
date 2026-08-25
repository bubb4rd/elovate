"use client";

import { motion, useReducedMotion } from "motion/react";
import { OpenBoardLink } from "@/components/open-board-link";

const ease = [0.16, 1, 0.3, 1] as const;

export function HomeHeroCopy() {
  const reduce = useReducedMotion();

  return (
    <div>
      <h1 className="mt-4 max-w-[14ch] text-4xl font-semibold tracking-tighter text-foreground md:text-5xl lg:text-6xl">
        <motion.span
          className="inline"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease }}
        >
          The{" "}
        </motion.span>
        <motion.span
          className="inline-block text-8xl accent-glow text-accent"
          initial={reduce ? false : { opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.14, ease }}
        >
          1%
        </motion.span>
        <motion.span
          className="inline"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease }}
        >
          {" "}
          never stops growing.
        </motion.span>
      </h1>
      <motion.p
        className="mt-4 max-w-[36ch] text-base leading-relaxed text-muted"
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.22, ease }}
      >
        Track how you stack up against the best.
      </motion.p>
      <motion.div
        className="mt-8"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.32, ease }}
      >
        <OpenBoardLink />
      </motion.div>
    </div>
  );
}
