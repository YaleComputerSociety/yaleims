"use client";
// A game's participants, behind a "Participants" toggle so the game lists
// stay short. The server decides who sees them and which (lib/participants.ts):
// who is on each side, ✓ when a captain pre-confirmed them; once a supervisor
// confirms players on a side, only those, ✓✓ (lib/rosterLevels.ts). After the
// start, a side nobody confirmed yet says so. Name first, NetID (and, for
// admins, the email) in small print. Read when opened, and again when
// `refreshKey` changes while open (the viewer signed up or withdrew).
import { useEffect, useState } from "react";
import { FaSpinner } from "react-icons/fa";
import PersonName from "@/components/ui/PersonName";
import { useSession } from "@/context/SessionContext";
import type { Match } from "@/lib/api/matches";
import { fetchRoster, type Roster } from "@/lib/api/roster";
import { collegeName } from "@/lib/colleges";
import { LEGEND, LEVELS, levelOf } from "@/lib/rosterLevels";

type Entry = Roster["items"][number];

const mark = (e: Entry) => LEVELS[levelOf(e)].mark;

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

  // A cancelled game shows nobody (C19); its roster is kept in case it is restored.
  if (!viewer || match.status === "cancelled") return null;

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
              {roster.items.some(mark) && <p>{LEGEND}</p>}
              {match.collegeIds.map((collegeId) => {
                const side = roster.items.filter((e) => e.collegeId === collegeId);
                const unconfirmed = roster.started && side.length > 0 && !side.some((e) => e.present);
                return (
                  <div key={collegeId}>
                    <span className="font-semibold text-black dark:text-gray-300">{collegeName(collegeId)}:</span>{" "}
                    {unconfirmed && <span className="italic">(no supervisor has confirmed anyone yet) </span>}
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
