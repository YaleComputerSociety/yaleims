import { getSession } from "@/server/session";
import {
  SeasonMatch,
  SeasonMatchPage,
  countSeasonMatches,
  listPlayedMatchesAllSeasons,
  listSeasonMatches,
  seasonMatchJson,
} from "@/server/data/matches";

/** Past-results windows: start = local midnight this many days ago. */
const PAST_WINDOWS = { today: 0, yesterday: 1, last7days: 7, last30days: 30, last60days: 60 };
type PastWindow = keyof typeof PAST_WINDOWS;

const text = (status: number, message: string) => new Response(message, { status });

/**
 * Paged matches for the scores page (past results), the schedules page and the
 * captain's team sign-ups (upcoming). Params: seasonId, pageSize, type
 * (index|next|prev), pageIndex, lastVisible/firstVisible (cursor ids),
 * sortOrder (default desc), college, sport ("All" = any), date:
 * - "AllPast" or a window (today, yesterday, last7days, …): scored matches
 *   that already started, from **every** season (seasonId is ignored);
 * - otherwise an ISO date: the season's unscored matches from that date on.
 *
 * Signed-in users only, on purpose for now: the pages show a "Sign in" prompt
 * on 401. What logged-out visitors may see is an open product decision (the
 * games page is public). Not a security boundary: match data is publicly
 * readable.
 */
export async function GET(req: Request) {
  try {
    if (!(await getSession())) {
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    }
    const params = new URL(req.url).searchParams;
    const seasonId = params.get("seasonId");
    if (!seasonId) {
      return Response.json({ error: "seasonId is required" }, { status: 400 });
    }
    const pageSize = params.get("pageSize");
    const type = params.get("type") ?? "";
    const sortOrder = params.get("sortOrder") || "desc";
    if (!pageSize) return text(400, "Missing required parameter: pageSize");
    if (!["next", "prev", "index"].includes(type)) {
      return text(400, "Invalid or missing 'type' parameter");
    }
    if (sortOrder !== "asc" && sortOrder !== "desc") {
      return text(400, "Invalid 'sortOrder' parameter");
    }

    const pageSizeNum = parseInt(pageSize, 10);
    const pageIndexNum = parseInt(params.get("pageIndex") || "1", 10) || 1;
    const lastVisible = params.get("lastVisible");
    const firstVisible = params.get("firstVisible");
    const college = params.get("college");
    const sport = params.get("sport");
    const filter = {
      college: college && college !== "All" ? college : undefined,
      sport: sport && sport !== "All" ? sport : undefined,
    };
    const date = params.get("date") ?? "";
    const now = new Date();

    if (date !== "AllPast" && !Object.hasOwn(PAST_WINDOWS, date)) {
      // Upcoming: one season, cursor paging in Firestore.
      const seasonFilter = { ...filter, scored: false, from: new Date(date) };
      const totalPages = Math.ceil(
        (await countSeasonMatches(seasonId, seasonFilter, sortOrder)) / pageSizeNum
      );
      let page: SeasonMatchPage;
      if (type === "next" && lastVisible) {
        page = { kind: "after", cursorId: lastVisible, limit: pageSizeNum };
      } else if (type === "prev" && firstVisible) {
        page = { kind: "before", cursorId: firstVisible, limit: pageSizeNum };
      } else if (type === "index") {
        page = { kind: "offset", offset: (pageIndexNum - 1) * pageSizeNum, limit: pageSizeNum };
      } else {
        page = { kind: "all" };
      }
      const rows = await listSeasonMatches(seasonId, seasonFilter, sortOrder, page);
      if (!rows) {
        return text(
          404,
          page.kind === "after"
            ? "Last visible document not found"
            : "First visible document not found"
        );
      }
      return pageResponse(rows, totalPages);
    }

    // Past results: every season, paged in memory.
    const days = date === "AllPast" ? undefined : PAST_WINDOWS[date as PastWindow];
    const from =
      days === undefined
        ? undefined
        : new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
    const played = await listPlayedMatchesAllSeasons({ from, before: now }, filter, sortOrder);
    const totalPages = Math.ceil(played.length / pageSizeNum);

    let rows: SeasonMatch[] = [];
    if (type === "next" && lastVisible) {
      const start = played.findIndex((m) => m.docId === lastVisible) + 1;
      rows = start < played.length ? played.slice(start, start + pageSizeNum) : [];
    } else if (type === "prev" && firstVisible) {
      const end = played.findIndex((m) => m.docId === firstVisible);
      rows = end > 0 ? played.slice(Math.max(0, end - pageSizeNum), end) : [];
    } else if (type === "index") {
      const start = (pageIndexNum - 1) * pageSizeNum;
      rows = played.slice(start, start + pageSizeNum);
    }
    return pageResponse(rows, totalPages);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return text(500, "Internal Server Error");
  }
}

function pageResponse(rows: SeasonMatch[], totalPages: number) {
  const matches = rows.map(seasonMatchJson);
  return Response.json({
    matches,
    firstVisible: matches[0]?.id || null,
    lastVisible: matches[matches.length - 1]?.id || null,
    totalPages,
  });
}
