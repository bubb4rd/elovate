"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import icon from "@/app/filled_icon.png";
import { ClimbMark } from "@/components/icons";

const ease = [0.16, 1, 0.3, 1] as const;

export function HomeAbout() {
  const reduce = useReducedMotion();

  return (
    <section
      id="about"
      aria-labelledby="home-about-heading"
      className="border-t border-border"
    >
      <div className="mx-auto w-full max-w-[1400px] px-4 py-16 md:px-8 md:py-20">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:items-start md:gap-16 lg:gap-24">
          <div>
            <motion.div
              className="flex items-center gap-2"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, ease }}
            >
              <ClimbMark className="size-3.5 text-accent" />
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-accent">
                About us
              </p>
            </motion.div>

            <motion.h2
              id="home-about-heading"
              className="mt-6 max-w-[16ch] text-3xl font-semibold tracking-tighter text-foreground md:text-4xl lg:text-5xl"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: 0.06, ease }}
            >
              Ranked shouldn&apos;t be a{" "}
              <span className="accent-glow text-accent">guessing game</span>.
            </motion.h2>

            <motion.div
              className="mt-8 flex items-center gap-3"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: 0.12, ease }}
            >
              <Image
                src={icon}
                alt=""
                width={44}
                height={44}
                className="size-11 shrink-0 rounded-full"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">elovate</p>
                <p className="text-xs leading-relaxed text-muted">
                  An independent Warzone tracker built around the Top 250 cutoff.
                </p>
              </div>
            </motion.div>
          </div>

          <div className="md:pt-1">
            <motion.p
              className="max-w-[46ch] text-base leading-relaxed text-muted"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: 0.18, ease }}
            >
              elovate is a Warzone SR tracker. We follow the live Top 250 cutoff,
              log the climbs you play, and keep your profile and friends in one
              place.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: 0.24, ease }}
            >
              <h3 className="mt-8 text-lg font-medium tracking-tight text-foreground">
                Why elovate?
              </h3>
              <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-muted md:text-base">
                A board shows where you stand. We show the distance to the cutoff,
                what your last session earned, and the SR still left. Warzone is
                live; Multiplayer is coming soon.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
