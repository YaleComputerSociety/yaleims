"use client";
// One game as a thin row (GAMES-REDESIGN-PLAN §2.1, the Sofascore layout):
// the state on the left (time, LIVE, FT, not scored, cancelled), the two
// colleges with the winner in bold and the points earned, the scores on the
// right. The row opens the game's page. A game without scores shows, at its
// right edge, the viewer's own level on it (signed up, ✓, ✓✓) or an action the
// list provides (the sign-up page's button); that part sits outside the link,
// so a button never nests inside one.
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Match } from "@/lib/api/matches";
import type { MyMatch } from "@/lib/api/me";
import { collegeName } from "@/lib/colleges";
import { pointsEarned } from "@/lib/format";
import { gameHref, gameTime, rowState, type RowState } from "@/lib/games";
import { getCollegeFlag } from "@/lib/images";
import { LEVELS, levelAt } from "@/lib/rosterLevels";
import type { MatchResult } from "@/types/firestore";

interface GameRowProps {
  match: Match;
  now: Date;
  /** The viewer's own entry when they're on the game. */
  mine?: MyMatch["mine"];
  /** A word under the state, e.g. the playoff round. */
  detail?: string;
  /** Shown at the right edge of a game without scores instead of the viewer's level. */
  action?: ReactNode;
}

export default function GameRow({ match, now, mine, detail, action }: GameRowProps) {
  const state = rowState(match, now);
  const aside = match.result ? null : (action ?? (mine && <MyLevel mine={mine} started={state !== "upcoming"} />));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/60 transition-colors">
      <Link href={gameHref(match)} className="grid grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 min-h-14">
        <State state={state} time={gameTime(match)} detail={detail} />
        <div className="flex flex-col gap-1 min-w-0">
          <Side match={match} side="home" state={state} />
          <Side match={match} side="away" state={state} />
        </div>
        {match.result && <Scores result={match.result} />}
      </Link>
      {aside && <div className="pr-3">{aside}</div>}
    </div>
  );
}

function State({ state, time, detail }: { state: RowState; time: string; detail?: string }) {
  const sub = (text: string) => <span className="block text-[10px] font-normal text-gray-500 dark:text-gray-400">{text}</span>;
  switch (state) {
    case "upcoming":
      return <Cell className="text-blue-600 dark:text-blue-400 font-semibold">{time}{detail && sub(detail)}</Cell>;
    case "live":
      return (
        <Cell className="text-red-600 dark:text-red-400 font-bold">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" aria-hidden />
            LIVE
          </span>
          {sub(time)}
        </Cell>
      );
    case "final":
      return <Cell className="text-gray-500 dark:text-gray-400 font-semibold">FT{detail && sub(detail)}</Cell>;
    case "unscored":
      return <Cell className="text-gray-400 dark:text-gray-500">—{sub(detail ?? "not scored")}</Cell>;
    case "cancelled":
      return <Cell className="text-red-600 dark:text-red-400 font-semibold">CANC{detail && sub(detail)}</Cell>;
  }
}

const Cell = ({ className, children }: { className: string; children: ReactNode }) => (
  <div className={`text-xs text-center tabular-nums leading-tight ${className}`}>{children}</div>
);

function Side({ match, side, state }: { match: Match; side: "home" | "away"; state: RowState }) {
  const collegeId = side === "home" ? match.homeCollegeId : match.awayCollegeId;
  const seed = side === "home" ? match.homeSeed : match.awaySeed;
  const name = collegeName(collegeId) ?? "TBD";
  const { result } = match;
  const decided = result?.outcome === "home" || result?.outcome === "away";
  const won = decided && result.outcome === side;
  const points = pointsEarned(match, side);
  const tone =
    state === "cancelled"
      ? "line-through text-gray-400 dark:text-gray-500"
      : won
        ? "font-semibold text-gray-900 dark:text-white"
        : decided
          ? "text-gray-500 dark:text-gray-400"
          : "text-gray-800 dark:text-gray-100";
  return (
    <div className={`flex items-center gap-2 min-w-0 text-sm ${tone}`}>
      {collegeId ? (
        <Image src={getCollegeFlag(name)} alt="" width={20} height={20} className="rounded-full flex-none" />
      ) : (
        <span className="w-5 h-5 rounded-full border border-dashed border-gray-400 flex-none" aria-hidden />
      )}
      <span className="truncate">
        {name}
        {seed && <span className="text-gray-400 dark:text-gray-500"> ({seed})</span>}
      </span>
      {decided && result.forfeit && !won && <Badge>FF</Badge>}
      {result?.outcome === "double_forfeit" && <Badge>DEF</Badge>}
      {points !== null && <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap">+{points} pts</span>}
    </div>
  );
}

/** A forfeit (FF) or a double forfeit (DEF). */
const Badge = ({ children }: { children: ReactNode }) => (
  <span className="px-1.5 py-px rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{children}</span>
);

function Scores({ result }: { result: MatchResult }) {
  const shared = result.outcome === "draw" || result.outcome === "double_forfeit";
  const tone = (side: "home" | "away") =>
    shared || result.outcome === side ? "font-bold text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400";
  return (
    <div className="flex flex-col items-end gap-1 pl-2 text-sm tabular-nums">
      <span className={tone("home")}>{result.homeScore ?? "–"}</span>
      <span className={tone("away")}>{result.awayScore ?? "–"}</span>
    </div>
  );
}

/** The viewer's level on the game: Signed up, Playing ✓ (pre-confirmed, before the game) or Playing ✓✓ (confirmed). */
function MyLevel({ mine, started }: { mine: MyMatch["mine"]; started: boolean }) {
  const { mark, label } = LEVELS[levelAt(mine, started)];
  return (
    <span
      title={label}
      className="px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
    >
      {mark ? `Playing ${mark}` : "Signed up"}
    </span>
  );
}
