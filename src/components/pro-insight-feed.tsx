"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import icon from "@/app/icon.png";
import { PRO_INSIGHTS } from "@/lib/home/pro-preview";

/**
 * The product speaking: a short in-app insight feed for the launch Pro features
 * a marquee chip cannot instruct on (who to queue with, when you catch T250,
 * what to fix in your placement). elovate surfaces only — `panel-elevated`, 6px,
 * `icon.png`, the `nav-notifications` rhythm — never OS toast chrome.
 *
 * Peek-stack: the top card is opaque, the two behind sit lower, smaller and
 * dimmer, so the three read as one object. Staggers in once on scroll; static
 * under reduced motion.
 */

const EASE = [0.16, 1, 0.3, 1] as const;
const PEEK = 12;

export function ProInsightFeed() {
  const reduce = useReducedMotion();
  const back = PRO_INSIGHTS.slice(1);

  return (
    <div
      className="relative"
      style={{ paddingBottom: back.length * PEEK }}
      role="group"
      aria-label="elovate Pro insights"
    >
      {back.map((insight, i) => {
        const depth = i + 1;
        const rest = {
          opacity: 1 - depth * 0.16,
          scale: 1 - depth * 0.03,
          y: 0,
        };
        return (
          <motion.div
            key={insight.id}
            aria-hidden
            className="panel-elevated absolute inset-x-0 rounded-[6px] px-4 py-3"
            style={{
              top: depth * PEEK,
              zIndex: 10 - depth,
              transformOrigin: "top",
            }}
            initial={reduce ? false : { ...rest, opacity: 0, y: 12 }}
            animate={reduce ? rest : undefined}
            whileInView={reduce ? undefined : rest}
            viewport={{ once: true, amount: 0.5 }}
            transition={
              reduce
                ? { duration: 0 }
                : { duration: 0.4, ease: EASE, delay: depth * 0.08 }
            }
          >
            <InsightBody insight={insight} />
          </motion.div>
        );
      })}

      <motion.div
        className="panel-elevated relative z-20 rounded-[6px] px-4 py-3"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={reduce ? { duration: 0 } : { duration: 0.4, ease: EASE }}
      >
        <InsightBody insight={PRO_INSIGHTS[0]!} />
      </motion.div>
    </div>
  );
}

function InsightBody({
  insight,
}: {
  insight: (typeof PRO_INSIGHTS)[number];
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Image
          src={icon}
          alt=""
          width={16}
          height={16}
          className="size-4 shrink-0 rounded-[3px]"
        />
        <span className="text-sm font-medium text-foreground">
          {insight.title}
        </span>
        <span className="ml-auto text-xs text-muted">{insight.age}</span>
      </div>
      <p className="mt-1 text-sm text-muted">
        <span className="numeric text-foreground">{insight.figure}</span>
        {insight.rest}
      </p>
    </>
  );
}
