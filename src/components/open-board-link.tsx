"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getModeSnapshot() {
  return localStorage.getItem("t250-mode") === "mp" ? "mp" : "wz";
}

function getServerSnapshot() {
  return "wz";
}

export function OpenBoardLink() {
  const mode = useSyncExternalStore(subscribe, getModeSnapshot, getServerSnapshot);
  const boardHref = `/${mode}`;
  const climbHref = `/${mode}/calc`;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <Button asChild>
        <Link href={boardHref}>Open board</Link>
      </Button>
      <Link
        href={climbHref}
        className="text-sm font-medium text-accent transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        See your climb
      </Link>
    </div>
  );
}
