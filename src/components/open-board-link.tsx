import Link from "next/link";
import { BoardPodiumIcon, ClimbSessionIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

export function OpenBoardLink() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <Button asChild>
        <Link href="/wz" className="gap-2">
          <BoardPodiumIcon className="size-6" />
          Top 250 board
        </Link>
      </Button>
      <Link
        href="/wz/calc"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ClimbSessionIcon className="size-3.5 accent-glow" />
        See your climb
      </Link>
    </div>
  );
}
