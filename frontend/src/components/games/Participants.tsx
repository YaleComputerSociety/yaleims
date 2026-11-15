// A game's participants (the game page): who is on each side, ✓ when a
// captain pre-confirmed them; once a supervisor confirms players on a side,
// only those, ✓✓ (lib/rosterLevels.ts). After the start, a side nobody
// confirmed yet says so. Name first, NetID (and, for admins, the email) in
// small print. The server decides who sees them and which
// (lib/participants.ts); the caller reads the roster (it also holds the
// viewer's own entry) and hands it over.
import PersonName from "@/components/ui/PersonName";
import type { Match } from "@/lib/api/matches";
import type { Roster } from "@/lib/api/roster";
import { collegeName } from "@/lib/colleges";
import { LEGEND, LEVELS, levelOf } from "@/lib/rosterLevels";

type Entry = Roster["items"][number];
const mark = (e: Entry) => LEVELS[levelOf(e)].mark;

export default function Participants({ match, roster }: { match: Match; roster: Roster }) {
  if (!roster.visible) {
    return <p className="text-xs text-gray-500">Only the two colleges&apos; players, people on this game and supervisors see who&apos;s playing.</p>;
  }
  return (
    <div className="space-y-1 text-left text-xs text-gray-500">
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
    </div>
  );
}
