import Link from "next/link";

export function DesktopHomeTeaser() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-3 px-4 py-10 md:flex-row md:items-end md:justify-between md:px-8">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            <span className="accent-glow bg-linear-to-r from-geebung-100 via-geebung-400 to-geebung-600 bg-clip-text text-transparent dark:from-geebung-100 dark:via-geebung-400 dark:to-geebung-500">
              elo
            </span>
            <span className="font-medium">vate</span>
            <span className="font-normal"> Desktop</span>
          </h2>
          <p className="mt-2 text-sm text-muted md:text-base">
            Coming soon. Opt in for product updates and possible beta testing.
          </p>
        </div>
        <Link
          href="/desktop"
          className="inline-flex h-10 items-center justify-center rounded-[6px] bg-accent px-4 text-sm font-medium text-accent-fg shadow-sm transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
        >
          Join waitlist
        </Link>
      </div>
    </section>
  );
}
