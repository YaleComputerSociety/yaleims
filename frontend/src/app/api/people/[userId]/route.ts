import { ApiError } from "@/lib/api/core";
import { personQuerySchema, profileFixSchema } from "@/lib/api/people";
import { authorize, can } from "@/server/auth";
import { getCurrentSeasonId } from "@/server/data/seasons";
import { noContent, ok, readBody, readQuery, route } from "@/server/http";
import { fixProfile, personView } from "@/server/services/people";

type Params = { userId: string };

const NO_USER = new ApiError("not-found", "No such user.");

/** One person in a season: identity, college history, roles, every game they're recorded on, their requests (admins). */
export const GET = route<Params>(async (req, { params }) => {
  const { userId } = await params;
  await authorize(can.managePeople);
  const { seasonId } = readQuery(req, personQuerySchema);
  const person = await personView(userId, seasonId);
  if (!person) throw NO_USER;
  return ok(person);
});

/** An admin's name (locked against the directory from then on) and/or Yale email for the person; audit-logged with the reason. */
export const PATCH = route<Params>(async (req, { params }) => {
  const { userId } = await params;
  const viewer = await authorize(can.managePeople);
  const fix = await readBody(req, profileFixSchema);
  const seasonId = await getCurrentSeasonId();
  if (!seasonId) throw new ApiError("conflict", "There's no current season to log this in.");
  if ((await fixProfile(userId, fix, seasonId, await viewer.actor())) === "not-found") throw NO_USER;
  return noContent();
});
