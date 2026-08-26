import type {
  ProfileMatch,
  ProfileSession,
  ProfileTeammate,
  SeedProfile,
} from "./types";
import type { WzPlacementId } from "@/lib/ranked";
import type { ProfileHeaderId } from "./headers";

function photo(seed: string, width: number, height: number): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

const RYN: ProfileTeammate = {
  displayName: "Ryn Vale",
  slug: "ryn-vale",
  avatarUrl: photo("ryn-vale-avatar", 128, 128),
};

const LUMEN: ProfileTeammate = {
  displayName: "Lumen Pike",
  slug: "lumen-pike",
  avatarUrl: photo("lumen-pike-avatar", 128, 128),
};

const HOLT: ProfileTeammate = {
  displayName: "Holt Fenn",
  slug: "holt-fenn",
  avatarUrl: photo("holt-fenn-avatar", 128, 128),
};

const OPAL: ProfileTeammate = {
  displayName: "Opal 9",
  slug: null,
  avatarUrl: null,
};

type MatchDraft = {
  createdAt: string;
  placement: WzPlacementId;
  squadElims: number;
  yourElims: number;
  net: number;
  teammates: ProfileTeammate[];
};

function withSr(prefix: string, startSr: number, drafts: MatchDraft[]): ProfileMatch[] {
  let sr = startSr;
  return drafts.map((draft, index) => {
    sr += draft.net;
    return {
      id: `${prefix}-m${index + 1}`,
      createdAt: draft.createdAt,
      placement: draft.placement,
      squadElims: draft.squadElims,
      yourElims: draft.yourElims,
      net: draft.net,
      srAfter: sr,
      teammates: draft.teammates,
    };
  });
}

function sessionFrom(
  id: string,
  startSr: number,
  matches: ProfileMatch[],
): ProfileSession {
  const last = matches[matches.length - 1];
  const first = matches[0];
  const endSr = last?.srAfter ?? startSr;
  return {
    id,
    startedAt: first?.createdAt ?? new Date().toISOString(),
    games: matches.length,
    net: endSr - startSr,
    startSr,
    endSr,
  };
}

function identity(
  slug: string,
  displayName: string,
  currentSr: number,
): SeedProfile {
  return {
    slug,
    displayName,
    handle: `@${slug}`,
    bannerUrl: photo(`${slug}-banner`, 1600, 480),
    avatarUrl: photo(`${slug}-avatar`, 256, 256),
    mode: "wz",
    currentSr,
    votes: { ups: 0, downs: 0 },
    grantedHeaderIds: [],
    equippedHeaderId: "default",
    matches: [],
    sessions: [],
  };
}

const kaiStart = 11578;
const kaiMatches = withSr("kai", kaiStart, [
  {
    createdAt: "2026-08-19T01:14:00.000Z",
    placement: "top6",
    squadElims: 8,
    yourElims: 2,
    net: 47,
    teammates: [RYN, LUMEN, HOLT],
  },
  {
    createdAt: "2026-08-19T01:38:00.000Z",
    placement: "top8",
    squadElims: 6,
    yourElims: 2,
    net: 35,
    teammates: [RYN, LUMEN, OPAL],
  },
  {
    createdAt: "2026-08-22T02:08:00.000Z",
    placement: "top4",
    squadElims: 9,
    yourElims: 3,
    net: 78,
    teammates: [RYN, LUMEN, HOLT],
  },
  {
    createdAt: "2026-08-22T02:31:00.000Z",
    placement: "first",
    squadElims: 11,
    yourElims: 4,
    net: 91,
    teammates: [RYN, LUMEN, HOLT],
  },
  {
    createdAt: "2026-08-22T02:54:00.000Z",
    placement: "top4",
    squadElims: 8,
    yourElims: 3,
    net: 68,
    teammates: [RYN, LUMEN, OPAL],
  },
  {
    createdAt: "2026-08-22T03:17:00.000Z",
    placement: "first",
    squadElims: 10,
    yourElims: 4,
    net: 84,
    teammates: [RYN, HOLT, OPAL],
  },
  {
    createdAt: "2026-08-22T03:41:00.000Z",
    placement: "first",
    squadElims: 12,
    yourElims: 5,
    net: 91,
    teammates: [RYN, LUMEN, HOLT],
  },
  {
    createdAt: "2026-08-25T23:12:00.000Z",
    placement: "top15",
    squadElims: 3,
    yourElims: 1,
    net: -147,
    teammates: [RYN, LUMEN, HOLT],
  },
  {
    createdAt: "2026-08-25T23:36:00.000Z",
    placement: "top15",
    squadElims: 4,
    yourElims: 0,
    net: -139,
    teammates: [LUMEN, HOLT, OPAL],
  },
  {
    createdAt: "2026-08-26T00:02:00.000Z",
    placement: "top13",
    squadElims: 5,
    yourElims: 1,
    net: -124,
    teammates: [RYN, HOLT, OPAL],
  },
  {
    createdAt: "2026-08-26T00:28:00.000Z",
    placement: "top15",
    squadElims: 3,
    yourElims: 1,
    net: -118,
    teammates: [RYN, LUMEN, HOLT],
  },
  {
    createdAt: "2026-08-26T00:51:00.000Z",
    placement: "first",
    squadElims: 25,
    yourElims: 10,
    net: 165,
    teammates: [RYN, LUMEN, OPAL],
  },
]);

const kaiWarmup = kaiMatches.slice(0, 2);
const kaiHeater = kaiMatches.slice(2, 7);
const kaiDrop = kaiMatches.slice(7);

const nashStart = 6318;
const nashMatches = withSr("nash", nashStart, [
  {
    createdAt: "2026-08-24T18:22:00.000Z",
    placement: "top4",
    squadElims: 7,
    yourElims: 3,
    net: 58,
    teammates: [HOLT, OPAL, RYN],
  },
  {
    createdAt: "2026-08-24T18:47:00.000Z",
    placement: "top6",
    squadElims: 6,
    yourElims: 2,
    net: 31,
    teammates: [HOLT, OPAL, RYN],
  },
  {
    createdAt: "2026-08-24T19:11:00.000Z",
    placement: "top10",
    squadElims: 4,
    yourElims: 1,
    net: -18,
    teammates: [HOLT, LUMEN, OPAL],
  },
  {
    createdAt: "2026-08-25T21:04:00.000Z",
    placement: "first",
    squadElims: 9,
    yourElims: 4,
    net: 83,
    teammates: [HOLT, LUMEN, RYN],
  },
]);

const fayeStart = 3194;
const fayeMatches = withSr("faye", fayeStart, [
  {
    createdAt: "2026-08-25T16:40:00.000Z",
    placement: "top8",
    squadElims: 5,
    yourElims: 2,
    net: 22,
    teammates: [OPAL, LUMEN, HOLT],
  },
  {
    createdAt: "2026-08-25T17:06:00.000Z",
    placement: "top4",
    squadElims: 8,
    yourElims: 3,
    net: 61,
    teammates: [OPAL, LUMEN, HOLT],
  },
  {
    createdAt: "2026-08-25T17:29:00.000Z",
    placement: "top13",
    squadElims: 3,
    yourElims: 1,
    net: 11,
    teammates: [OPAL, RYN, HOLT],
  },
]);

const KAI: SeedProfile = {
  slug: "bo",
  displayName: "bode",
  handle: "@bo",
  bannerUrl: photo("kai-mendez-banner", 1600, 480),
  avatarUrl: photo("kai-mendez-avatar", 256, 256),
  mode: "wz",
  currentSr: kaiMatches[kaiMatches.length - 1]!.srAfter,
  votes: { ups: 24, downs: 6 },
  allTimePeakSr: 12880,
  grantedHeaderIds: ["elovate-staff"] satisfies ProfileHeaderId[],
  equippedHeaderId: "default",
  matches: kaiMatches,
  sessions: [
    sessionFrom("kai-s1", kaiStart, kaiWarmup),
    sessionFrom("kai-s2", kaiWarmup[kaiWarmup.length - 1]!.srAfter, kaiHeater),
    sessionFrom("kai-s3", kaiHeater[kaiHeater.length - 1]!.srAfter, kaiDrop),
  ],
};

const NASH: SeedProfile = {
  slug: "nash-wren",
  displayName: "Nash Wren",
  handle: "@nash-wren",
  bannerUrl: photo("nash-wren-banner", 1600, 480),
  avatarUrl: photo("nash-wren-avatar", 256, 256),
  mode: "wz",
  currentSr: nashMatches[nashMatches.length - 1]!.srAfter,
  votes: { ups: 9, downs: 3 },
  matches: nashMatches,
  sessions: [
    sessionFrom("nash-s1", nashStart, nashMatches.slice(0, 3)),
    sessionFrom("nash-s2", nashMatches[2]!.srAfter, nashMatches.slice(3)),
  ],
};

const FAYE: SeedProfile = {
  slug: "faye-sol",
  displayName: "Faye Sol",
  handle: "@faye-sol",
  bannerUrl: photo("faye-sol-banner", 1600, 480),
  avatarUrl: photo("faye-sol-avatar", 256, 256),
  mode: "wz",
  currentSr: fayeMatches[fayeMatches.length - 1]!.srAfter,
  votes: { ups: 1, downs: 1 },
  matches: fayeMatches,
  sessions: [sessionFrom("faye-s1", fayeStart, fayeMatches)],
};

export const SEED_PROFILES: SeedProfile[] = [
  KAI,
  NASH,
  FAYE,
  identity("ryn-vale", "Ryn Vale", 8421),
  identity("lumen-pike", "Lumen Pike", 7114),
  identity("holt-fenn", "Holt Fenn", 5688),
];

export function getSeedProfile(slug: string): SeedProfile | undefined {
  return SEED_PROFILES.find((profile) => profile.slug === slug);
}
