// Bracket ids: a bracket's doc id is a slug of its name, and a sport's
// playoffs are named "<Sport> Playoffs", so the playoffs of a sport are found
// by name. Shared by the server and the browser pages.
import { slugify } from "./slug";

export const playoffsName = (sportName: string) => `${sportName} Playoffs`;

/** The doc id of the bracket named `name` ("" if it has no letters or digits). */
export const bracketIdOf = (name: string) => slugify(name);
