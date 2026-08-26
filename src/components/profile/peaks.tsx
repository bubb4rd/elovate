import { ProfileBlob } from "@/components/profile/profile-blob";
import { formatDelta, formatLocalDay, formatSr } from "@/lib/format";
import type { ProfilePeaks } from "@/lib/profile/types";

export function Peaks({ peaks }: { peaks: ProfilePeaks }) {
  const empty =
    peaks.seasonPeakSr == null &&
    peaks.peakRankLabel == null &&
    peaks.bestSession == null;

  if (empty) {
    return (
      <ProfileBlob title="Peaks" className="h-full min-h-80">
        <p className="text-sm text-muted">No peaks yet.</p>
      </ProfileBlob>
    );
  }

  return (
    <ProfileBlob title="Peaks" className="h-full min-h-80">
      <dl className="space-y-4">
        {peaks.seasonPeakSr != null ? (
          <div>
            <dt className="text-[11px] text-muted">Season SR</dt>
            <dd className="numeric mt-0.5 text-lg font-semibold">
              {formatSr(peaks.seasonPeakSr)}
            </dd>
            {peaks.allTimePeakSr != null ? (
              <p className="numeric mt-0.5 text-[11px] text-muted">
                All-time {formatSr(peaks.allTimePeakSr)}
              </p>
            ) : null}
          </div>
        ) : null}

        {peaks.peakRankLabel ? (
          <div>
            <dt className="text-[11px] text-muted">Highest rank</dt>
            <dd className="mt-0.5 text-lg font-semibold tracking-tight">
              {peaks.peakBoardRank != null ? `#${peaks.peakBoardRank}` : peaks.peakRankLabel}
            </dd>
            {peaks.peakBoardRank != null ? (
              <p className="mt-0.5 text-[11px] text-muted">{peaks.peakRankLabel}</p>
            ) : null}
          </div>
        ) : null}

        {peaks.bestSession ? (
          <div>
            <dt className="text-[11px] text-muted">Best session</dt>
            <dd className="mt-0.5 flex items-baseline gap-2">
              <span className="numeric text-lg font-semibold text-accent accent-glow">
                {formatDelta(peaks.bestSession.net)}
              </span>
              <span className="text-[11px] text-muted">
                {peaks.bestSession.games} {peaks.bestSession.games === 1 ? "game" : "games"}
              </span>
            </dd>
            <p className="mt-0.5 text-[11px] text-muted">
              {formatLocalDay(peaks.bestSession.startedAt)}
            </p>
          </div>
        ) : null}
      </dl>
    </ProfileBlob>
  );
}
