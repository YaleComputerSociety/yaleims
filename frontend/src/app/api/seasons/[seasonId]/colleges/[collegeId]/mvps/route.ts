import type { MvpList } from "@/lib/api/colleges";
import { toJson } from "@/lib/api/core";
import { authorize, can } from "@/server/auth";
import { listCollegeMvps } from "@/server/data/mvps";
import { ok, route } from "@/server/http";

type Params = { seasonId: string; collegeId: string };

/** The college's MVPs of the season by week, with the winners' player ids (the college's rep, admins/devs). */
export const GET = route<Params>(async (req, { params }) => {
  const { seasonId, collegeId } = await params;
  await authorize(can.nameMvps, collegeId);
  const mvps = (await listCollegeMvps(seasonId, collegeId)).sort((a, b) => a.week - b.week || a.name.localeCompare(b.name));
  return ok({ items: toJson(mvps), total: mvps.length } satisfies MvpList);
});
