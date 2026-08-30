"use client";

import { HistorySessionList } from "@/components/history/history-session-list";

export function HistoryPageContent({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="py-6 md:py-8">
      <HistorySessionList signedIn={signedIn} />
    </div>
  );
}
