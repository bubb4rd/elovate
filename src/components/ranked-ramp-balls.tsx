"use client";

import Matter from "matter-js";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

/** Total time to spawn every ball, when count is small enough that a stagger reads as intentional. */
const FALL_WINDOW_MS = 1600;
/** Never wait longer than this between spawns, even for a tiny count. */
const MAX_STAGGER_MS = 60;
/** Never spawn faster than this, even for a large count — keeps individual drops visible. */
const MIN_STAGGER_MS = 4;

const FALLBACK_ACCENT = "#f2c81d";

/**
 * Day-zero ramp-up view: one physical ball per player currently at or above
 * Iridescent SR this season (see `getLiveIridescentCount` — deliberately not
 * gated at `MIN_PLAYER_COUNT`, since a genuinely small count is the whole
 * point here). Balls drop and settle via real Matter.js physics; with
 * `prefers-reduced-motion` they're placed already at rest, no animation.
 */
export function RankedRampBalls({
  count,
  height = 300,
}: {
  count: number;
  height?: number;
}) {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || count <= 0) return;

    const width = container.clientWidth;
    if (width <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const accentRaw = getComputedStyle(container).getPropertyValue("--accent").trim();
    const accent = accentRaw || FALLBACK_ACCENT;

    // Radius shrinks as count grows so up to ~250 balls still roughly fit.
    const radius = Math.max(3, Math.min(9, Math.round(1400 / Math.max(count, 1))));

    const engine = Matter.Engine.create();
    const world = engine.world;

    const wallOptions: Matter.IChamferableBodyDefinition = { isStatic: true, friction: 0.4 };
    const floor = Matter.Bodies.rectangle(width / 2, height + 20, width + 40, 40, wallOptions);
    const leftWall = Matter.Bodies.rectangle(-20, height / 2, 40, height * 2, wallOptions);
    const rightWall = Matter.Bodies.rectangle(width + 20, height / 2, 40, height * 2, wallOptions);
    Matter.Composite.add(world, [floor, leftWall, rightWall]);

    const radiusByBody = new Map<Matter.Body, number>();

    function addBall() {
      const r = radius * (0.85 + Math.random() * 0.3);
      const x = r + Math.random() * Math.max(width - r * 2, 1);
      const ball = Matter.Bodies.circle(x, -r * 2, r, {
        restitution: 0.35,
        friction: 0.15,
        frictionAir: 0.01,
      });
      radiusByBody.set(ball, r);
      Matter.Composite.add(world, ball);
    }

    let spawnTimer: ReturnType<typeof setInterval> | null = null;
    if (reduce) {
      for (let i = 0; i < count; i++) addBall();
      // Settle instantly rather than animating — several fast steps, no render until done.
      for (let i = 0; i < 120; i++) Matter.Engine.update(engine, 1000 / 60);
    } else {
      const stagger = Math.min(MAX_STAGGER_MS, Math.max(MIN_STAGGER_MS, FALL_WINDOW_MS / count));
      let spawned = 0;
      spawnTimer = setInterval(() => {
        addBall();
        spawned += 1;
        if (spawned >= count && spawnTimer) {
          clearInterval(spawnTimer);
          spawnTimer = null;
        }
      }, stagger);
    }

    const runner = reduce ? null : Matter.Runner.create();
    if (runner) Matter.Runner.run(runner, engine);

    let raf = 0;
    function draw() {
      ctx!.clearRect(0, 0, width, height);
      ctx!.globalAlpha = 0.85;
      ctx!.fillStyle = accent;
      for (const [ball, r] of radiusByBody) {
        ctx!.beginPath();
        ctx!.arc(ball.position.x, ball.position.y, r, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      if (spawnTimer) clearInterval(spawnTimer);
      if (raf) cancelAnimationFrame(raf);
      if (runner) Matter.Runner.stop(runner);
      Matter.Composite.clear(world, false);
      Matter.Engine.clear(engine);
    };
  }, [count, height, reduce]);

  if (count <= 0) {
    return (
      <div
        style={{ height }}
        className="mt-4 flex w-full items-center justify-center rounded-[10px] border border-border bg-surface text-sm text-muted"
      >
        No one has reached Top 250 yet this season.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className="relative mt-4 w-full overflow-hidden rounded-[10px] border border-border bg-surface"
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
