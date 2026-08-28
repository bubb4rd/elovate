"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_ACTION_COOLDOWN_SEC,
  parseRetryAfterSeconds,
} from "@/lib/action-cooldown";

export function useActionCooldown() {
  const [remaining, setRemaining] = useState(0);
  const endAtRef = useRef(0);
  const cooling = remaining > 0;

  useEffect(() => {
    if (!cooling) return;

    function tick() {
      const left = Math.ceil((endAtRef.current - Date.now()) / 1000);
      setRemaining(left > 0 ? left : 0);
    }

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [cooling]);

  function start(seconds: number) {
    const sec = Math.max(0, Math.ceil(seconds));
    if (sec <= 0) {
      endAtRef.current = 0;
      setRemaining(0);
      return;
    }
    endAtRef.current = Date.now() + sec * 1000;
    setRemaining(sec);
  }

  function startFromError(
    message: string,
    fallback = DEFAULT_ACTION_COOLDOWN_SEC,
  ) {
    start(parseRetryAfterSeconds(message) ?? fallback);
  }

  return {
    remaining,
    cooling,
    start,
    startFromError,
  };
}
