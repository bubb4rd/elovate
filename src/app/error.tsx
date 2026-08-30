"use client";

import { useEffect } from "react";
import { ErrorRecovery } from "@/components/error-recovery";
import { reportError } from "@/lib/ops/report-error";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    reportError("app", error);
  }, [error]);

  return <ErrorRecovery retry={retry} />;
}
