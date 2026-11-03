"use client";
// One game on game day (U5-ROSTER-WORKFLOW.md): the roster sheet (a captain
// prepares their side; a supervisor takes attendance) and, for supervisors,
// the score; the ⋯ menu edits, cancels or deletes the game. The tabs and the
// menu follow what the session says the viewer may do; the server checks
// each call again.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { FaChevronLeft, FaEllipsisH } from "react-icons/fa";
import PageHeading from "@/components/layout/PageHeading";
import LoadingScreen from "@/components/layout/LoadingScreen";
import SignInPrompt from "@/components/layout/SignInPrompt";
import RosterSheet from "@/components/gameday/RosterSheet";
import ScorePanel from "@/components/gameday/ScorePanel";
import { CancelledBadge } from "@/components/games/MyEntryStatus";
import { EditMatchModal } from "@/components/hub/admin/EditMatchModal";
import { useSeasonDetail } from "@/context/SeasonContext";
import { useSession } from "@/context/SessionContext";
import { deleteMatch, editMatch, fetchMatch, type Match } from "@/lib/api/matches";
import { sideName } from "@/lib/format";
import { useNow } from "@/lib/useNow";

type Tab = "roster" | "score";

export default function GamePage() {
  const { seasonId, matchId } = useParams<{ seasonId: string; matchId: string }>();
  const { viewer, loading } = useSession();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const sports = useSeasonDetail(seasonId)?.sports;
  const now = useNow();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("roster");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(() => {
    fetchMatch(seasonId, matchId).then(setMatch, (err) => setError((err as Error).message));
  }, [seasonId, matchId]);
  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingScreen />;
  if (!viewer) {
    return (
      <div className="min-h-screen pt-20 px-6">
        <SignInPrompt message="Sign in to see this game's roster." />
      </div>
    );
  }
  if (error) return <p className="pt-32 text-center text-red-600">{error}</p>;
  if (!match) return <LoadingScreen />;

  const sport = sports?.find((s) => s.id === match.sportId);
  const supervisor = viewer.can.takeAttendance;
  const started = new Date(match.startsAt).getTime() <= now;
  const when = new Date(match.startsAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const back = supervisor ? { href: "/hub/game-day", label: "Game day" } : { href: "/hub/my-team", label: "My team" };

  const act = async (action: () => Promise<void>, done: string) => {
    setMenuOpen(false);
    try {
      await action();
      toast.success(done);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  const cancelled = match.status === "cancelled";

  return (
    <div className="min-h-screen pt-20 pb-16">
      <PageHeading heading={supervisor ? "Game Day" : "My Team"} />
      <div className="max-w-xl mx-auto px-3 space-y-4">
        <div className="flex items-center justify-between">
          <Link href={back.href} className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
            <FaChevronLeft /> {back.label}
          </Link>
          {viewer.can.editSchedule && (
            <div className="relative">
              <button
                aria-label="More"
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <FaEllipsisH />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1 w-48 rounded-lg shadow-lg bg-white dark:bg-gray-900 ring-1 ring-black/10 dark:ring-white/10 z-20 py-1 text-sm">
                  <button className="block w-full text-left px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5" onClick={() => { setMenuOpen(false); setEditing(true); }}>
                    Edit time and place
                  </button>
                  {!match.result && (
                    <button
                      className="block w-full text-left px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5"
                      onClick={() =>
                        act(
                          () => editMatch(seasonId, matchId, { status: cancelled ? "scheduled" : "cancelled" }).then(load),
                          cancelled ? "Game restored" : "Game cancelled"
                        )
                      }
                    >
                      {cancelled ? "Restore game" : "Cancel game"}
                    </button>
                  )}
                  {!match.result && !match.bracketId && (
                    <button
                      className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => {
                        if (!window.confirm("Delete this game and its roster? This can't be undone in the app.")) return;
                        act(() => deleteMatch(seasonId, matchId).then(() => router.push(back.href)), "Game deleted");
                      }}
                    >
                      Delete game
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <header className="rounded-xl bg-gray-50 dark:bg-gray-900 px-4 py-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-2">
            <span>{sport?.emoji} {sport?.name}</span>
            {match.stage === "playoff" && <span>· {match.round ?? "Playoffs"}</span>}
            {cancelled && <CancelledBadge />}
          </div>
          <h2 className="text-2xl font-bold mt-1">
            {sideName(match.homeCollegeId)} <span className="text-gray-400 font-normal">vs</span> {sideName(match.awayCollegeId)}
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {when}
            {match.venue ? ` · ${match.venue}` : ""}
            {match.venueDetail ? ` · ${match.venueDetail}` : ""}
          </div>
        </header>

        {viewer.can.score && (
          <div className="grid grid-cols-2 rounded-lg bg-gray-100 dark:bg-gray-900 p-1 text-sm font-semibold">
            {(["roster", "score"] as const).map((t) => (
              <button
                key={t}
                className={`py-2 rounded-md ${tab === t ? "bg-white dark:bg-gray-800 shadow" : "text-gray-500"}`}
                onClick={() => setTab(t)}
              >
                {t === "roster" ? (supervisor ? "Attendance" : "Roster") : match.result ? "Score ✓" : "Score"}
              </button>
            ))}
          </div>
        )}

        {tab === "score" && viewer.can.score ? (
          <ScorePanel match={match} onSaved={load} />
        ) : (
          <>
            {!supervisor && !started && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Confirm who&apos;s playing, take off anyone who isn&apos;t, and add teammates who didn&apos;t sign up. The
                supervisor takes attendance at the game.
              </p>
            )}
            <RosterSheet match={match} />
          </>
        )}
      </div>

      {editing && <EditMatchModal match={match} setModalOpen={setEditing} onSaved={load} />}
    </div>
  );
}
