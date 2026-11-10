"use client";
// A game's participants, behind a "Participants" toggle so the game lists
// stay short. The server decides who sees them and which (lib/participants.ts):
// who is on each side, ✓ when a captain confirmed them; once a supervisor
// takes attendance on a side, only those recorded present, ✓✓. Name first,
// NetID (and, for admins, the email) in small print. Read when opened, and
// again when `refreshKey` changes while open (the viewer signed up or withdrew).
import { useEffect, useState } from "react";
import { FaSpinner } from "react-icons/fa";
import PersonName from "@/components/ui/PersonName";
import { useSession } from "@/context/SessionContext";
import type { Match } from "@/lib/api/matches";
import { fetchRoster, type Roster } from "@/lib/api/roster";
import { collegeName } from "@/lib/colleges";

type Entry = Roster["items"][number];

/** A player's mark: ✓✓ recorded present by a supervisor, ✓ confirmed by a captain, none: signed up. */
const mark = (e: Entry) => (e.present ? "✓✓" : e.captainStatus === "confirmed" ? "✓" : "");

export default function Participants({ match, refreshKey }: { match: Match; refreshKey?: unknown }) {
  const { viewer } = useSession();
  const [open, setOpen] = useState(false);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) return;
    let live = true;
    fetchRoster(match.seasonId, match.id).then(
      (r) => live && (setRoster(r), setFailed(false)),
      () => live && setFailed(true)
    );
    return () => {
      live = false;
    };
  }, [open, refreshKey, match.seasonId, match.id]);

  if (!viewer) return null;

  return (
    <div className="text-xs text-gray-500">
      <button className="underline" aria-expanded={open} onClick={() => setOpen(!open)}>
        Participants
      </button>
      {open && (
        <div className="mt-2 space-y-1 text-left">
          {failed ? (
            <p>Couldn&apos;t load the participants. Try again later.</p>
          ) : !roster ? (
            <FaSpinner className="animate-spin" aria-label="Loading" />
          ) : !roster.visible ? (
            <p>Only the two colleges&apos; players, people on this game and supervisors see who&apos;s playing.</p>
          ) : (
            <>
              {roster.items.some(mark) && <p>✓ confirmed by a captain · ✓✓ present (recorded by a supervisor)</p>}
              {match.collegeIds.map((collegeId) => {
                const side = roster.items.filter((e) => e.collegeId === collegeId);
                return (
                  <div key={collegeId}>
                    <span className="font-semibold text-black dark:text-gray-300">{collegeName(collegeId)}:</span>{" "}
                    {side.length === 0 ? (
                      <span>nobody yet</span>
                    ) : (
                      <ul className="inline">
                        {side.map((e, i) => (
                          <li key={i} className="inline text-gray-800 dark:text-gray-300">
                            <PersonName person={e} />
                            {mark(e) && <span className="text-emerald-700 dark:text-emerald-400"> {mark(e)}</span>}
                            {i < side.length - 1 && ", "}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
