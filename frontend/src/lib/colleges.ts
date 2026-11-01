// College names → ids. Yalies, old user docs and old MVP paths name a college
// with or without " College" ("Morse", "Morse College"); v3 refers to it by
// id (its abbreviation, "MC"). No dependencies, so the migration
// (database/migrate) uses it too.

/**
 * The id of the college called `name`, given the season's colleges; null if
 * none matches. An id passed as `name` is returned as is.
 */
export function collegeIdOfName(
  colleges: { id: string; name: string }[],
  name: unknown
): string | null {
  if (typeof name !== "string") return null;
  const wanted = name.trim().replace(/ College$/, "");
  const college = colleges.find((c) => c.name === wanted || c.id === wanted);
  return college?.id ?? null;
}
