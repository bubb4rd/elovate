"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getSnapshot() {
  const stored = localStorage.getItem("t250-mode");
  return stored === "mp" ? "/mp" : "/wz";
}

function getServerSnapshot() {
  return "/wz";
}

export function OpenBoardLink() {
  const href = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <Button asChild>
      <Link href={href}>Open board</Link>
    </Button>
  );
}
