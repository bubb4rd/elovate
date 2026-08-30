"use client";

import { useEffect } from "react";
import type { Mode } from "@/lib/data/types";

export function RememberMode({ mode }: { mode: Mode }) {
  useEffect(() => {
    localStorage.setItem("elovate-mode", mode);
    window.dispatchEvent(new Event("storage"));
  }, [mode]);
  return null;
}
