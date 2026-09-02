import { DiscordLogo, XLogo } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import icon from "@/app/icon.png";
import { BrandWordmark } from "@/components/brand-wordmark";
import { cn } from "@/lib/utils";

const DISCORD_INVITE_URL = "https://discord.gg/N77wPh8exE";
const X_PROFILE_URL = "https://x.com/elovatesr";

export function SiteFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className="shrink-0 border-t border-border">
      <div
        className={cn(
          "mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-6 text-sm text-muted",
          className,
        )}
      >
        <Link
          href="/"
          aria-label="elovate"
          className="inline-flex flex-1 items-center gap-1.5 text-foreground"
        >
          <Image src={icon} alt="" width={20} height={20} className="size-5 shrink-0 rounded-[5px]" />
          <BrandWordmark />
        </Link>
        <p className="shrink-0 text-center whitespace-nowrap">&copy; {year} elovate</p>
        <div className="flex flex-1 items-center justify-end gap-4">
          <Link
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="elovate on Discord"
            className="hover:text-foreground"
          >
            <DiscordLogo weight="fill" className="size-5" />
          </Link>
          <Link
            href={X_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="elovate on X"
            className="hover:text-foreground"
          >
            <XLogo weight="fill" className="size-5" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
