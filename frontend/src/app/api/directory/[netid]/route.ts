import { directoryNetidSchema, type DirectoryEntry } from "@/lib/api/directory";
import { authorize, can } from "@/server/auth";
import { findUserByNetid, getUser } from "@/server/data/users";
import { listColleges } from "@/server/data/colleges";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { ok, readParams, route } from "@/server/http";
import { collegeIdOfName } from "@/lib/colleges";
import { yaliesProfile } from "@/server/yaleLogin";

/**
 * Who a NetID is, before adding them to a game (captains and supervisors):
 * the account that has it, else the Yale directory's person, else "not
 * found" or "unavailable" (Yalies can't be reached).
 */
export const GET = route<{ netid: string }>(async (req, { params }) => {
  await authorize(can.addPlayers);
  const { netid } = await readParams(params, directoryNetidSchema);
  const seasonId = await getCurrentSeasonId();
  const colleges = seasonId ? await listColleges(seasonId) : [];
  let entry: DirectoryEntry;
  try {
    const profile = await yaliesProfile(netid);
    entry = profile
      ? {
          status: "found",
          netid,
          name: `${profile.first_name} ${profile.last_name}`.trim(),
          collegeId: collegeIdOfName(colleges, profile.college),
        }
      : { status: "not-found", netid };
  } catch {
    entry = { status: "unavailable", netid };
  }
  if (entry.status !== "found") {
    const known = await findUserByNetid(netid);
    const user = known ? await getUser(known) : null;
    if (user) entry = { status: "found", netid, name: `${user.firstname} ${user.lastname}`.trim(), collegeId: null };
  }
  return ok(entry);
});
