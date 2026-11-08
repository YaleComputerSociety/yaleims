import { peopleQuerySchema, type PeopleList } from "@/lib/api/people";
import { authorize, can } from "@/server/auth";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { ok, readQuery, route } from "@/server/http";
import { findByNetid, listUnassigned, listUnclaimed } from "@/server/services/people";

/** People by exact NetID, or this season's players without a college, or accounts nobody has signed in to yet (admins). */
export const GET = route(async (req) => {
  await authorize(can.managePeople);
  const query = readQuery(req, peopleQuerySchema);
  const seasonId = await getCurrentSeasonId();
  const items =
    "netid" in query
      ? await findByNetid(query.netid, seasonId)
      : query.list === "unclaimed"
        ? await listUnclaimed(seasonId)
        : seasonId
          ? await listUnassigned(seasonId)
          : [];
  return ok({ items, total: items.length } satisfies PeopleList);
});
