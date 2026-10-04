import {
  SeasonMatchPage,
  countSeasonMatches,
  listSeasonMatches,
  seasonMatchJson,
} from "@/server/data/matches";

const text = (status: number, message: string) => new Response(message, { status });

/**
 * One season's matches (public; the games page reads the whole season).
 * Required: seasonId; with paginate (default "true") also pageSize and type
 * (index|next|prev). Optional: pageIndex, lastVisible/firstVisible (cursor
 * ids), sortOrder (default asc), college/sport ("All" = any), scored
 * (all|scored|unscored), dateFrom/dateTo (ISO, inclusive). paginate=false
 * returns every match and ignores the paging params.
 */
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const seasonId = params.get("seasonId");
    if (!seasonId) {
      return Response.json({ error: "seasonId is required" }, { status: 400 });
    }
    const pageSize = params.get("pageSize");
    const type = params.get("type") ?? "";
    const sortOrder = params.get("sortOrder") || "asc";
    const scored = params.get("scored") || "all";
    const paginate = params.get("paginate") !== "false";
    if (paginate) {
      if (!pageSize) return text(400, "Missing required parameter: pageSize");
      if (!["next", "prev", "index"].includes(type)) {
        return text(400, "Invalid or missing 'type' parameter");
      }
    }
    if (sortOrder !== "asc" && sortOrder !== "desc") {
      return text(400, "Invalid 'sortOrder' parameter");
    }
    if (!["all", "scored", "unscored"].includes(scored)) {
      return text(400, "Invalid 'scored' parameter. Use 'all', 'scored', or 'unscored'.");
    }

    const college = params.get("college");
    const sport = params.get("sport");
    const dateFrom = params.get("dateFrom");
    const dateTo = params.get("dateTo");
    const filter = {
      college: college && college !== "All" ? college : undefined,
      sport: sport && sport !== "All" ? sport : undefined,
      scored: scored === "all" ? undefined : scored === "scored",
      from: dateFrom ? new Date(dateFrom) : undefined,
      to: dateTo ? new Date(dateTo) : undefined,
    };

    let page: SeasonMatchPage = { kind: "all" };
    let totalResults = 0;
    let totalPages = 1;
    if (paginate) {
      const pageSizeNum = parseInt(pageSize!, 10);
      const pageIndexNum = parseInt(params.get("pageIndex") || "1", 10) || 1;
      const lastVisible = params.get("lastVisible");
      const firstVisible = params.get("firstVisible");
      totalResults = await countSeasonMatches(seasonId, filter, sortOrder);
      totalPages = Math.ceil(totalResults / pageSizeNum);
      if (type === "next" && lastVisible) {
        page = { kind: "after", cursorId: lastVisible, limit: pageSizeNum };
      } else if (type === "prev" && firstVisible) {
        page = { kind: "before", cursorId: firstVisible, limit: pageSizeNum };
      } else {
        page = { kind: "offset", offset: (pageIndexNum - 1) * pageSizeNum, limit: pageSizeNum };
      }
    }

    const rows = await listSeasonMatches(seasonId, filter, sortOrder, page);
    if (!rows) {
      return text(
        404,
        page.kind === "after"
          ? "Last visible document not found"
          : "First visible document not found"
      );
    }
    const matches = rows.map(seasonMatchJson);
    if (!paginate) totalResults = matches.length;
    return Response.json({
      matches,
      firstVisible: matches[0]?.id || null,
      lastVisible: matches[matches.length - 1]?.id || null,
      totalPages,
      totalResults,
    });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return text(500, "Internal Server Error");
  }
}
