"use client";

import { CaretDown, CrownSimpleIcon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import icon from "@/app/icon.png";
import { cn } from "@/lib/utils";
import { BrandWordmark } from "./brand-wordmark";

/**
 * Home feature showcase.
 *
 * A full-bleed "stripe" of dashboard-style cards for the metrics elovate
 * surfaces: two marquee rows drifting opposite ways, cards repeating on the
 * outside. Pro cards carry the accent treatment so the tier reads at a glance.
 * Below the stripe, a framed panel that pitches Pro with notification-style
 * insight cards. The complete feature list lives on /pro.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

type Feature = {
  tier: "Free" | "Pro";
  label: string;
  value: string;
  note: string;
  trend?: "up" | "down";
};

const FEATURES: Feature[] = [
  { tier: "Free", label: "Profile themes", value: "10", note: "+ seasonal releases"},
  { tier: "Free", label: "SR calculator", value: "+27", note: "last match" },
  { tier: "Free", label: "Session climb", value: "+142", note: "live", trend: "up" },
  { tier: "Free", label: "Match history", value: "500", note: "recent games" },
  { tier: "Pro", label: "Teammate breakdown", value: "+14", note: "SR/game · top duo", trend: "up" },
  { tier: "Pro", label: "Placement efficiency", value: "61%", note: "from elim SR" },
  { tier: "Pro", label: "Trend & projection", value: "+38", note: "SR/day · 7d", trend: "up" },
  { tier: "Pro", label: "SR to T250", value: "-318", note: "closing", trend: "up" },
  { tier: "Pro", label: "Cutoff alerts", value: "ON", note: "moved +40 today" },
  { tier: "Pro", label: "Full cutoff history", value: "S1-S5", note: "every season" },
];

const ROW_ONE = [...FEATURES, ...FEATURES.slice(0, 3)];
const ROW_TWO = [...FEATURES.slice(4), ...FEATURES.slice(0, 6)];

export function HomeElovateSection() {
  const reduce = useReducedMotion();

  return (
    <section className="overflow-hidden border-t border-border py-14 md:py-20">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mx-auto max-w-[1400px] px-4 text-center"
      >
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          <span className="theme-heading accent-glow">Ten signals</span> for the climb
        </h2>
        <p className="mx-auto mt-3 max-w-prose text-sm text-muted md:text-base">
          Free tracks where you stand. Pro tells you what to do about it.
        </p>
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mt-10 flex flex-col gap-3"
      >
        <Marquee features={ROW_ONE} dir="left" reduce={!!reduce} />
        <Marquee features={ROW_TWO} dir="right" reduce={!!reduce} />
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="mx-auto mt-14 max-w-[1400px] px-4 md:px-8"
      >
        <ProPanel reduce={!!reduce} />
      </motion.div>
    </section>
  );
}

function Marquee({
  features,
  dir,
  reduce,
}: {
  features: Feature[];
  dir: "left" | "right";
  reduce: boolean;
}) {
  const loop = [...features, ...features];
  const anim = dir === "left" ? ["0%", "-50%"] : ["-50%", "0%"];
  return (
    <div className="flex">
      <motion.div
        className="flex w-max gap-3 pr-3"
        style={{ willChange: "transform" }}
        animate={reduce ? undefined : { x: anim }}
        transition={
          reduce
            ? undefined
            : { duration: 100, ease: "linear", repeat: Infinity }
        }
      >
        {loop.map((f, i) => (
          <FeatureCard key={`${f.label}-${i}`} feature={f} />
        ))}
      </motion.div>
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const pro = feature.tier === "Pro";
  return (
    <div
      className={cn(
        "flex w-[190px] shrink-0 flex-col rounded-[10px] border px-3.5 py-3 sm:w-[220px]",
        pro ? "border-accent/40 bg-accent/[0.05]" : "border-border bg-surface",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "truncate text-[13px] font-medium",
            pro ? "text-accent" : "text-foreground",
          )}
        >
          {feature.label}
        </span>
        {pro ? (
          <CrownSimpleIcon weight="fill" className="size-3.5 shrink-0 text-accent" aria-hidden />
        ) : (
          <CaretDown weight="bold" className="size-3 shrink-0 text-muted" aria-hidden />
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span
          className={cn(
            "numeric text-lg leading-none",
            pro ? "text-accent" : "text-foreground",
          )}
        >
          {feature.value}
        </span>
        <div className="flex items-center gap-1">
          <span className="whitespace-nowrap text-[11px] text-muted">{feature.note}</span>
          {feature.trend ? <Sparkline dir={feature.trend} pro={pro} /> : null}
        </div>
      </div>
    </div>
  );
}

function Sparkline({ dir, pro }: { dir: "up" | "down"; pro: boolean }) {
  const points =
    dir === "up"
      ? "1,13 8,11 15,12 22,7 29,8 36,2"
      : "1,3 8,5 15,4 22,9 29,8 36,13";
  return (
    <svg
      viewBox="0 0 37 15"
      className={cn(
        "h-3.5 w-9 shrink-0",
        dir === "down" ? "text-negative" : pro ? "text-accent" : "text-muted",
      )}
      fill="none"
      aria-hidden
    >
      <polyline
        points={points}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProPanel({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-accent/30 bg-surface-elevated p-6 md:p-10">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-accent/10 blur-3xl"
        animate={reduce ? undefined : { opacity: [0.45, 0.85, 0.45] }}
        transition={
          reduce ? undefined : { duration: 6, ease: "easeInOut", repeat: Infinity }
        }
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
      <div className="relative grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.2em] text-accent">
            <CrownSimpleIcon weight="fill" className="size-6" />
            <div className="flex gap-1">
              <BrandWordmark className="text-lg" /> <p className="text-lg font-bold">Pro</p>
            </div>
          </div>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            See what the data is telling you
          </h3>
          <p className="mt-3 max-w-md text-sm text-muted md:text-base">
            Teammate splits, placement efficiency, and a projected date for every
            climb goal, built on the matches you already log.
          </p>
          <Link
            href="/pro"
            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-[6px] bg-accent px-4 text-sm font-medium text-accent-fg shadow-sm transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
          >
            <CrownSimpleIcon weight="fill" className="size-4" />
            Join elovate Pro
          </Link>
        </div>
        <NotificationStack reduce={reduce} />
      </div>
    </div>
  );
}

const NOTIFICATIONS = [
  { head: "Best duo", body: "You're +14 SR/game with Vex. Queue this squad.", time: "now" },
  { head: "SR to Top 250", body: "608 to go, 12 days at your current pace.", time: "2m" },
  { head: "Placement efficiency", body: "61% of your SR is elims. Push for top-5.", time: "1h" },
];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function NotificationStack({ reduce }: { reduce: boolean }) {
  // iOS-style banner drop: each card springs in from just above with a little
  // overshoot, one after another. The gaps and spring are jittered a touch so
  // the burst feels like real notifications landing, not a metronome.
  const timings = useMemo(
    () =>
      NOTIFICATIONS.map((_, i) => ({
        // 0.55s base spacing keeps them in order; up to 0.4s of jitter on top
        // so the burst never feels metronomic.
        delay: 0.12 + i * 0.55 + rand(0, 0.4),
        stiffness: rand(460, 620),
        damping: rand(23, 30),
      })),
    [],
  );

  return (
    <motion.ul
      className="flex flex-col gap-2.5"
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.5 }}
      variants={{ hidden: {}, show: {} }}
    >
      {NOTIFICATIONS.map((n, i) => (
        <motion.li
          key={n.head}
          variants={
            reduce
              ? undefined
              : {
                  hidden: { opacity: 0, y: -18, scale: 0.8 },
                  show: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      mass: 0.9,
                      stiffness: timings[i].stiffness,
                      damping: timings[i].damping,
                      delay: timings[i].delay,
                      opacity: { duration: 0.18, delay: timings[i].delay },
                    },
                  },
                }
          }
          style={{ transformOrigin: "top center" }}
          className="flex items-start gap-3 rounded-[10px] border border-border bg-surface px-3.5 py-3 shadow-sm"
        >
          <Image
            src={icon}
            alt=""
            width={28}
            height={28}
            className="size-7 shrink-0 rounded-[6px]"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-semibold text-foreground">elovate Pro</p>
              <span className="shrink-0 text-[10px] text-muted">{n.time}</span>
            </div>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">
              <span className="font-medium text-foreground">{n.head}.</span>{" "}
              {n.body}
            </p>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
}
