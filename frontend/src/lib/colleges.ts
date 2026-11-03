// The 14 residential colleges, and college names → ids. Yalies, old user docs
// and old MVP paths name a college with or without " College" ("Morse",
// "Morse College"); v3 refers to it by id (its abbreviation, "MC").

/** The residential colleges: id (abbreviation) and name, as every season stores them. */
export const COLLEGES = [
  { id: "BF", name: "Benjamin Franklin" },
  { id: "BK", name: "Berkeley" },
  { id: "BR", name: "Branford" },
  { id: "DC", name: "Davenport" },
  { id: "ES", name: "Ezra Stiles" },
  { id: "GH", name: "Grace Hopper" },
  { id: "JE", name: "Jonathan Edwards" },
  { id: "MC", name: "Morse" },
  { id: "MY", name: "Pauli Murray" },
  { id: "PC", name: "Pierson" },
  { id: "SY", name: "Saybrook" },
  { id: "SM", name: "Silliman" },
  { id: "TD", name: "Timothy Dwight" },
  { id: "TC", name: "Trumbull" },
] as const;

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

/** The college's name ("Morse" for "MC"); null for none or an unknown id. */
export function collegeName(collegeId: string | null | undefined): string | null {
  return COLLEGES.find((c) => c.id === collegeId)?.name ?? null;
}
