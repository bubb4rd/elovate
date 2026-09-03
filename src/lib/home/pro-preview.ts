/**
 * Sample data for the homepage Pro section (signal marquee + insight feed).
 *
 * One source so the numbers cannot drift between the marquee chip and the
 * insight that instructs on it: placement is 38% everywhere, the T250 gap is
 * 310, the duo is Bode. Launch-tier Pro only — no PREM-12/PREM-13 backlog.
 */

export type SignalTone = "accent" | "negative" | "plain";

export type HomeSignal = {
  id: string;
  kind: "free" | "pro";
  label: string;
  /** Already formatted for display. */
  value: string;
  valueTone: SignalTone;
  /** <= 4 words. */
  support: string;
  /** A real 8-20 point series for this metric, or omitted. */
  spark?: number[];
};

export type HomeInsight = {
  id: string;
  /** Static relative age for the feed timestamp. */
  age: string;
  title: string;
  /** Leading figure, rendered in `.numeric`. */
  figure: string;
  /** The rest of the sentence: the instruction. */
  rest: string;
};

export const FREE_SIGNALS: HomeSignal[] = [
  {
    id: "session",
    kind: "free",
    label: "Session climb",
    value: "+142",
    valueTone: "accent",
    support: "live",
    spark: [8210, 8188, 8235, 8262, 8244, 8290, 8321, 8305, 8352],
  },
  {
    id: "calc",
    kind: "free",
    label: "SR calculator",
    value: "+27",
    valueTone: "accent",
    support: "last match",
  },
  {
    id: "history",
    kind: "free",
    label: "Match history",
    value: "500",
    valueTone: "plain",
    support: "recent games",
  },
  {
    id: "themes",
    kind: "free",
    label: "Profile themes",
    value: "10",
    valueTone: "plain",
    support: "+ seasonal",
  },
];

export const PRO_SIGNALS: HomeSignal[] = [
  {
    id: "teammate",
    kind: "pro",
    label: "Teammate",
    value: "+214",
    valueTone: "accent",
    support: "with Bode",
    spark: [-30, 55, 40, -20, 65, 35, -45, 60, 40, 55, 70],
  },
  {
    id: "placement",
    kind: "pro",
    label: "Placement",
    value: "38%",
    valueTone: "accent",
    support: "from elims",
  },
  {
    id: "trend",
    kind: "pro",
    label: "Trend",
    value: "Sep 11",
    valueTone: "plain",
    support: "next tier",
    spark: [8480, 8455, 8525, 8560, 8540, 8605, 8650, 8690, 8760],
  },
  {
    id: "t250",
    kind: "pro",
    label: "SR to T250",
    value: "310",
    valueTone: "plain",
    support: "to cutoff",
  },
  {
    id: "unlimited",
    kind: "pro",
    label: "History",
    value: "2,847",
    valueTone: "plain",
    support: "every season",
  },
];

export const PRO_INSIGHTS: HomeInsight[] = [
  {
    id: "duo",
    age: "now",
    title: "Best duo",
    figure: "+14",
    rest: " SR/game with Bode. Queue this squad.",
  },
  {
    id: "t250",
    age: "2m",
    title: "SR to T250",
    figure: "310",
    rest: " to go. 12 days at this pace.",
  },
  {
    id: "placement",
    age: "1h",
    title: "Placement",
    figure: "38%",
    rest: " of SR is elims. Push for top-5.",
  },
];
