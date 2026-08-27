"use client";

import { Camera, DiscordLogo, SquaresFour } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";

const ease = [0.16, 1, 0.3, 1] as const;

const ITEMS = [
  {
    icon: DiscordLogo,
    title: "Discord integration",
    body: "Show your climb on Rich Presence while you play.",
  },
  {
    icon: Camera,
    title: "Screenshot capture",
    body: "Grab the end-of-match board and land it in Climb with a keybind.",
  },
  {
    icon: SquaresFour,
    title: "And more",
    body: "Overlay calculator and the rest of the desktop kit after beta.",
  },
] as const;

export function DesktopWhatsComing() {
  const reduce = useReducedMotion();

  return (
    <section id="features" className="border-b border-border px-4 py-16 md:px-8 md:py-20">
      <div className="mx-auto w-full max-w-[720px]">
        <motion.p
          className="text-center text-xs font-medium uppercase tracking-[0.22em] text-accent"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.4, ease }}
        >
          What’s coming
        </motion.p>

        <ul className="mt-10 divide-y divide-border border-y border-border">
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.li
                key={item.title}
                className="flex gap-4 py-6 md:gap-5"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease }}
              >
                <Icon weight="fill" className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                <div className="min-w-0 space-y-1">
                  <p className="text-base font-medium text-foreground">{item.title}</p>
                  <p className="text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
