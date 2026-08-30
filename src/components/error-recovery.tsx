"use client";

import Link from "next/link";
import { BrandWordmark } from "@/components/brand-wordmark";
import { Button } from "@/components/ui/button";

export function ErrorRecovery({ retry }: { retry: () => void }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="shrink-0">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center px-4">
          <Link
            href="/"
            aria-label="elovate"
            className="inline-flex items-center text-base font-semibold tracking-tight text-foreground"
          >
            <BrandWordmark />
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-4">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-muted">
          This page hit an unexpected error. You can try again or go home.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button type="button" onClick={retry}>
            Try again
          </Button>
          <Link href="/" className="text-accent hover:underline">
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
