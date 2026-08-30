"use client";

import { useEffect } from "react";
import { ErrorRecovery } from "@/components/error-recovery";
import { reportError } from "@/lib/ops/report-error";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    reportError("root", error);
  }, [error]);

  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-background font-sans text-foreground">
        <title>Something went wrong | elovate</title>
        <ErrorRecovery retry={retry} />
      </body>
    </html>
  );
}
