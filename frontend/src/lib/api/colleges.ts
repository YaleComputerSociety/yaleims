// The colleges API: what belongs to a college in a season, under
// /api/seasons/{seasonId}/colleges/{collegeId}.
import { z } from "zod";
import { COLLEGES } from "@/lib/colleges";

/** A college id ("MC"); the 14 are the same every season. */
export const collegeIdSchema = z.enum(COLLEGES.map((c) => c.id));
