import type { MvpList } from "@/lib/api/colleges";
import { toJson } from "@/lib/api/core";
import { authorize, can } from "@/server/auth";
import { listCollegeMvps } from "@/server/data/mvps";
import { getUsers, identityOf } from "@/server/data/users";
import { ok, route } from "@/server/http";

type Params = { seasonId: string; collegeId: string };

/** The college's MVPs of the season by week, with the winners' player ids and identities (the college's rep, admins/devs: emails). */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId, collegeId } = await params;
  const viewer = await authorize(can.nameMvps, collegeId);
  const awards = await listCollegeMvps(seasonId, collegeId);
  const [users, withEmail] = await Promise.all([getUsers(awards.map((m) => m.playerId)), can.seeEmails(viewer)]);
  const items = awards
    .map((m) => ({ ...toJson(m), ...identityOf(users.get(m.playerId), m.name, withEmail) }))
    .sort((a, b) => a.week - b.week || a.name.localeCompare(b.name));
  return ok({ items, total: items.length } satisfies MvpList);
});
