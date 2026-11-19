// How each sport's scoresheet differs, after Fusion Play's paper sheets: the
// tally columns in the roster, what goes under each roster (running score
// grids, scoring boxes, foul and timeout tallies), and who signs. Sports not
// listed (broomball, cornhole, dodgeball, pickleball, spikeball, table
// tennis, and any new one) get the default sheet. Keys are lowercase sport
// names as seasons store them ("CHoops", "MHoops" and "WHoops" are basketball).

/** A roster column the scorekeeper circles marks in, e.g. Fouls "1 2 3 4 5 T1 T2". */
export interface TallyColumn {
  header: string;
  marks: string;
  width: number;
}

/** One row of a running score grid. */
export interface ScoreLine {
  from: number;
  to: number;
  /** Printed bold and underlined: the score that wins a set. */
  target?: number;
}

/** What goes under each roster, top to bottom. */
export type Block =
  | { kind: "grid"; lines: ScoreLine[] }
  | { kind: "boxes"; labels: string[] }
  /**
   * Lines of text by row and column. Columns are as wide as the boxes above
   * them; spread instead pushes the last column to the right edge.
   */
  | { kind: "tallies"; rows: string[][]; spread?: boolean };

export interface SportLayout {
  rosterRows: number;
  columns: TallyColumn[];
  blocks: Block[];
  possessionArrow: boolean;
  /**
   * The officials' lines: beside the Winner box (left, right), and between
   * the two sportsmanship lines. null keeps a column empty.
   */
  signatures: { top: [string | null, string | null]; bottom: (string | null)[] };
}

const counted = (max: number, perRow: number): ScoreLine[] =>
  Array.from({ length: max / perRow }, (_, i) => ({ from: i * perRow + 1, to: (i + 1) * perRow }));

const YELLOW: TallyColumn = { header: "Yellow", marks: "1 2", width: 32 };
const RED: TallyColumn = { header: "Red", marks: "1", width: 24 };

const DEFAULT: SportLayout = {
  rosterRows: 15,
  columns: [],
  blocks: [{ kind: "grid", lines: counted(100, 20) }],
  possessionArrow: false,
  signatures: { top: ["Official #1", "Supervisor"], bottom: ["Official #2", null, "Field Judge"] },
};

const SOCCER: SportLayout = {
  rosterRows: 16,
  columns: [{ header: "Blue", marks: "1 2", width: 26 }, YELLOW, RED],
  blocks: [
    { kind: "grid", lines: [{ from: 1, to: 30 }] },
    { kind: "boxes", labels: ["1st Half Scoring", "2nd Half Scoring", "Overtime Scoring"] },
    { kind: "tallies", rows: [["Timeouts: 1 2", "Timeouts: 1 2", ""]] },
  ],
  possessionArrow: false,
  signatures: { top: ["Official #1", "Official #3"], bottom: ["Official #2", null, "Supervisor"] },
};

const BASKETBALL: SportLayout = {
  rosterRows: 15,
  columns: [{ header: "Fouls", marks: "1 2 3 4 5   T1 T2", width: 74 }],
  blocks: [
    {
      kind: "tallies",
      rows: [
        ["1st Half Fouls: 1 2 3 4 5 6 7 8 9 10", "2nd Half Fouls: 1 2 3 4 5 6 7 8 9 10"],
        ["Timeouts: 1 2", "Timeouts: 1 2"],
      ],
      spread: true,
    },
    { kind: "grid", lines: counted(100, 25) },
  ],
  possessionArrow: true,
  signatures: { top: ["Scorekeeper", "Supervisor"], bottom: ["Official #1", "Official #2", "Official #3"] },
};

const LAYOUTS: Record<string, SportLayout> = {
  basketball: BASKETBALL,
  choops: BASKETBALL,
  mhoops: BASKETBALL,
  whoops: BASKETBALL,
  "flag football": {
    rosterRows: 20,
    columns: [{ header: "UC's", marks: "1 2", width: 28 }],
    blocks: [{ kind: "boxes", labels: ["1st Half Scoring", "2nd Half Scoring"] }],
    possessionArrow: false,
    signatures: {
      top: ["Supervisor #1", "Supervisor #2"],
      bottom: ["Referee", "Field Judge", "Line Judge", "Back Judge"],
    },
  },
  soccer: SOCCER,
  "indoor soccer": SOCCER,
  "outdoor soccer": SOCCER,
  volleyball: {
    rosterRows: 15,
    columns: [YELLOW, RED],
    blocks: [
      {
        kind: "grid",
        lines: [
          { from: 1, to: 30, target: 25 },
          { from: 1, to: 30, target: 25 },
          { from: 1, to: 30, target: 15 },
        ],
      },
      { kind: "tallies", rows: [["Timeouts: G1 G2 G3"]] },
    ],
    possessionArrow: false,
    signatures: { top: [null, null], bottom: ["Supervisor", "Up Referee", "Down Referee"] },
  },
};

export const sportLayout = (sport: string): SportLayout => LAYOUTS[sport.trim().toLowerCase()] ?? DEFAULT;
