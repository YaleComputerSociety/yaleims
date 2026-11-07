import { directoryNetidSchema, type DirectoryEntry } from "@/lib/api/directory";
import { authorize, can } from "@/server/auth";
import { displayName, findUserByNetid } from "@/server/data/users";
import { listColleges } from "@/server/data/colleges";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { ok, readParams, route } from "@/server/http";
import { collegeIdOfName } from "@/lib/colleges";
import { lookUpNetid } from "@/server/directory";

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
  const found = await lookUpNetid(netid);
  let entry: DirectoryEntry = found.person
    ? { status: "found", netid, name: found.person.name ?? netid, collegeId: collegeIdOfName(colleges, found.person.college) }
    : { status: found.outcome, netid };
  if (entry.status !== "found") {
    const user = await findUserByNetid(netid);
    if (user) entry = { status: "found", netid, name: displayName(user), collegeId: null };
  }
  return ok(entry);
});
