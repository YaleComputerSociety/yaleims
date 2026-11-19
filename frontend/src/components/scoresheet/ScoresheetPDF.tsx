import { Document, Image as PdfImage, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { scoresheetFileName } from "./fileName";
import { sportLayout, type Block, type ScoreLine, type SportLayout, type TallyColumn } from "./sports";
import type { Game, Player, Team } from "./types";

const EASTERN = "America/New_York";
const day = new Intl.DateTimeFormat("en-US", { timeZone: EASTERN, weekday: "long", month: "long", day: "numeric", year: "numeric" });
const time = new Intl.DateTimeFormat("en-US", { timeZone: EASTERN, hour: "numeric", minute: "2-digit" });
/** public/LOGO.png's width over its height. */
const LOGO_RATIO = 3150 / 667;
const LOGO_WIDTH = 150;

const ROW_HEIGHT = 15;
/** Rosters longer than the sport's rows shrink their rows down to this before the table grows. */
const MIN_ROW_HEIGHT = 10;
/** Between the two team columns; the VS mark sits in it. */
const GUTTER = 16;
const COL = { gp: 20, id: 72, status: 34, number: 18 };
const BORDER = 0.75;
const STRIPE = "#e3e3e3";
const STATUSES: [string, string][] = [
  ["G", "Gender missing"],
  ["M", "Membership missing"],
  ["S", "Suspended"],
  ["W", "Waivers unsigned"],
];
const POSSESSION = "H V H V H V H V H V H V H V H V";

const s = StyleSheet.create({
  page: { paddingVertical: 24, paddingHorizontal: 28, fontFamily: "Helvetica", fontSize: 7.5, flexDirection: "column" },

  header: { flexDirection: "row", alignItems: "flex-start" },
  // The two side columns are as wide as each other so the details between them sit at the page's center.
  brandCol: { width: 190 },
  legendSide: { width: 190, alignItems: "flex-end" },
  brand: { fontFamily: "Helvetica-Bold", fontSize: 18, letterSpacing: 0.5 },
  logo: { width: LOGO_WIDTH, height: LOGO_WIDTH / LOGO_RATIO },
  badge: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 6,
    backgroundColor: "#000",
    color: "#fff",
    fontSize: 8.5,
  },
  league: { fontSize: 8.5, marginTop: 3 },
  detailsCol: { flex: 1, alignItems: "center" },
  when: { fontSize: 11 },
  where: { fontSize: 9.5, marginTop: 3 },
  gameNo: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 3 },
  possession: { fontSize: 7.5, marginTop: 6, textAlign: "center" },
  legendCol: { width: 112 },
  legendTitle: { fontFamily: "Helvetica-Bold", fontSize: 7.5, paddingBottom: 3, borderBottomWidth: 1 },
  legendRow: { flexDirection: "row", paddingVertical: 2.5, borderBottomWidth: 0.5, borderColor: "#ccc" },
  legendCode: { fontFamily: "Helvetica-Bold", width: 12 },

  teamsHead: { flexDirection: "row", alignItems: "center", marginTop: 6, marginBottom: 3 },
  teamName: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 9.5, textAlign: "center" },
  vsSlot: { width: GUTTER, alignItems: "center" },
  vs: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: "#000",
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 5.5,
    textAlign: "center",
    paddingTop: 4.5,
  },

  teams: { flexDirection: "row", gap: GUTTER },
  teamCol: { flex: 1 },

  // Grid: the table draws its top and left edges, each cell its right and bottom, so lines never double.
  grid: { borderTopWidth: BORDER, borderLeftWidth: BORDER },
  row: { flexDirection: "row" },
  cell: { borderRightWidth: BORDER, borderBottomWidth: BORDER, justifyContent: "center", paddingHorizontal: 3 },
  headText: { fontFamily: "Helvetica-Bold", fontSize: 7 },
  centered: { textAlign: "center" },
  oneLine: { maxLines: 1, textOverflow: "ellipsis" },

  block: { marginTop: 6 },
  scoreCell: { flex: 1, height: 15, borderRightWidth: BORDER, borderBottomWidth: BORDER, justifyContent: "center" },
  scoreText: { fontSize: 6.5, textAlign: "center" },
  target: { fontFamily: "Helvetica-Bold", textDecoration: "underline" },
  boxes: { flexDirection: "row", gap: 8 },
  box: { flex: 1, height: 34, borderWidth: BORDER, padding: 3 },
  tallies: { flexDirection: "row", gap: 8 },
  tallyColumn: { rowGap: 5 },

  footer: { marginTop: "auto" },
  sigRow: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  sig: { flex: 1 },
  sigLine: { height: 20, borderBottomWidth: BORDER },
  sigCaption: { fontSize: 7, marginTop: 3 },
  winnerBox: { height: 22, borderWidth: BORDER },
});

const teamLabel = ({ name, record }: Team) =>
  record ? `${name} (${record.wins}-${record.losses}-${record.ties})` : name;

function Header({ game, layout, logo }: { game: Game; layout: SportLayout; logo?: string }) {
  const startsAt = new Date(game.startsAt);
  return (
    <View style={s.header}>
      <View style={s.brandCol}>
        {logo ? <PdfImage src={logo} style={s.logo} /> : <Text style={s.brand}>YaleIMs</Text>}
        <Text style={s.badge}>{game.sport.toUpperCase()}</Text>
        {/* {game.league && <Text style={s.league}>{game.league}</Text>} */}
        {/* {game.division && <Text style={s.league}>{game.division}</Text>} */}
      </View>
      <View style={s.detailsCol}>
        <Text style={s.when}>
          {day.format(startsAt)} at {time.format(startsAt)}
        </Text>
        <Text style={s.where}>@ {game.location}</Text>
        {game.gameNumber && <Text style={s.gameNo}>Game {game.gameNumber}</Text>}
        {layout.possessionArrow && (
          <Text style={s.possession}>
            Possession Arrow{"\n"}
            {POSSESSION}
          </Text>
        )}
      </View>
      <View style={s.legendSide}>
        <View style={s.legendCol}>
          <Text style={s.legendTitle}>Player Status</Text>
          {STATUSES.map(([code, meaning]) => (
            <View key={code} style={s.legendRow}>
              <Text style={s.legendCode}>{code}</Text>
              <Text>= {meaning}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function TeamsHead({ home, away }: { home: Team; away: Team }) {
  return (
    <View style={s.teamsHead}>
      <Text style={[s.teamName, s.oneLine]}>{teamLabel(home)}</Text>
      <View style={s.vsSlot}>
        <Text style={s.vs}>VS</Text>
      </View>
      <Text style={[s.teamName, s.oneLine]}>{teamLabel(away)}</Text>
    </View>
  );
}

function RosterTable({ players, columns, rows, minRows }: { players: Player[]; columns: TallyColumn[]; rows: number; minRows: number }) {
  const height = Math.max(MIN_ROW_HEIGHT, (ROW_HEIGHT * minRows) / rows);
  const lines = Array.from({ length: rows }, (_, i) => players[i]);
  type Size = { width: number } | { flex: number };
  const head: [string, Size, boolean][] = [
    ["GP", { width: COL.gp }, false],
    ["NetID", { width: COL.id }, false],
    ["Status", { width: COL.status }, false],
    ["Name", { flex: 1 }, false],
    ["#", { width: COL.number }, true],
    ...columns.map((c): [string, Size, boolean] => [c.header, { width: c.width }, true]),
  ];
  return (
    <View style={s.grid}>
      <View style={[s.row, { height: ROW_HEIGHT }]}>
        {head.map(([label, size, centered]) => (
          <View key={label} style={[s.cell, size]}>
            <Text style={centered ? [s.headText, s.centered] : s.headText}>{label}</Text>
          </View>
        ))}
      </View>
      {lines.map((player, i) => (
        <View key={i} style={[s.row, { height }, i % 2 === 0 ? { backgroundColor: STRIPE } : {}]}>
          <View style={[s.cell, { width: COL.gp }]}>
            <Text style={s.centered}>{player?.gamesPlayed ?? ""}</Text>
          </View>
          <View style={[s.cell, { width: COL.id }]}>
            <Text style={s.oneLine}>{player?.netId ?? ""}</Text>
          </View>
          <View style={[s.cell, { width: COL.status }]}>
            <Text style={s.centered}>{player?.status ?? ""}</Text>
          </View>
          <View style={[s.cell, { flex: 1 }]}>
            <Text style={s.oneLine}>{player?.name ?? ""}</Text>
          </View>
          <View style={[s.cell, { width: COL.number }]}>
            <Text style={s.centered}>{player?.jerseyNumber ?? ""}</Text>
          </View>
          {columns.map((c) => (
            <View key={c.header} style={[s.cell, { width: c.width }]}>
              <Text style={s.centered}>{c.marks}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function ScoreGrid({ lines }: { lines: ScoreLine[] }) {
  return (
    <View style={s.grid}>
      {lines.map((line, r) => (
        <View key={r} style={s.row}>
          {Array.from({ length: line.to - line.from + 1 }, (_, i) => line.from + i).map((n) => (
            <View key={n} style={s.scoreCell}>
              <Text style={n === line.target ? [s.scoreText, s.target] : s.scoreText}>{n}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "grid":
      return <ScoreGrid lines={block.lines} />;
    case "boxes":
      return (
        <View style={s.boxes}>
          {block.labels.map((label) => (
            <View key={label} style={s.box}>
              <Text>{label}</Text>
            </View>
          ))}
        </View>
      );
    case "tallies": {
      const columns = block.rows[0].map((_, c) => block.rows.map((row) => row[c] ?? ""));
      return (
        <View style={[s.tallies, block.spread ? { justifyContent: "space-between" } : {}]}>
          {columns.map((lines, c) => (
            <View key={c} style={block.spread ? s.tallyColumn : [s.tallyColumn, { flex: 1 }]}>
              {lines.map((line, r) => (
                <Text key={r}>{line}</Text>
              ))}
            </View>
          ))}
        </View>
      );
    }
  }
}

function TeamColumn({ team, layout, rows }: { team: Team; layout: SportLayout; rows: number }) {
  return (
    <View style={s.teamCol}>
      <RosterTable players={team.players} columns={layout.columns} rows={rows} minRows={layout.rosterRows} />
      {layout.blocks.map((block, i) => (
        <View key={i} style={s.block}>
          <BlockView block={block} />
        </View>
      ))}
    </View>
  );
}

function Signature({ label }: { label: string | null }) {
  if (!label) return <View style={s.sig} />;
  return (
    <View style={s.sig}>
      <View style={s.sigLine} />
      <Text style={s.sigCaption}>{label}</Text>
    </View>
  );
}

function Signatures({ layout }: { layout: SportLayout }) {
  const { top, bottom } = layout.signatures;
  return (
    <View style={s.footer}>
      <View style={s.sigRow}>
        <Signature label="Team 1 Score" />
        <Signature label={top[0]} />
        <View style={s.sig}>
          <View style={s.winnerBox} />
          <Text style={[s.sigCaption, s.centered]}>Winner</Text>
        </View>
        <Signature label={top[1]} />
        <Signature label="Team 2 Score" />
      </View>
      <View style={[s.sigRow, { marginTop: 10 }]}>
        <Signature label="Team 1 Sportsmanship" />
        {bottom.map((label, i) => (
          <Signature key={i} label={label} />
        ))}
        <Signature label="Team 2 Sportsmanship" />
      </View>
    </View>
  );
}

/** `logo`: a URL (or, rendering in Node, a file path) of public/LOGO.png; without it the header names Yale IMs in text. */
export default function ScoresheetPDF({ game, logo }: { game: Game; logo?: string }) {
  const layout = sportLayout(game.sport);
  // Both tables get the same row count so what's under them lines up.
  const rows = Math.max(layout.rosterRows, game.home.players.length, game.away.players.length);
  return (
    <Document title={scoresheetFileName(game).replace(/\.pdf$/, "")} author="Yale IMs">
      <Page size="LETTER" orientation="landscape" style={s.page}>
        <Header game={game} layout={layout} logo={logo} />
        <TeamsHead home={game.home} away={game.away} />
        <View style={s.teams}>
          <TeamColumn team={game.home} layout={layout} rows={rows} />
          <TeamColumn team={game.away} layout={layout} rows={rows} />
        </View>
        <Signatures layout={layout} />
      </Page>
    </Document>
  );
}
