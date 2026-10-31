// Bracket doc ids are slugs of the bracket's name (doc ids can't contain
// slashes). No dependencies, so the migration (database/migrate) uses it too.

/** "One Day Volleyball Tournament" → "one-day-volleyball-tournament" (at most 80 chars). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
