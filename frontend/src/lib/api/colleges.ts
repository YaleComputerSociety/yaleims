// The colleges API: what belongs to a college in a season, under
// /api/seasons/{seasonId}/colleges/{collegeId}.
import { z } from "zod";
import { COLLEGES } from "@/lib/colleges";

const COLLEGE_IDS: string[] = COLLEGES.map((c) => c.id);

/** A college id ("MC"); the 14 are the same every season. A string, as the docs store it. */
export const collegeIdSchema = z.string().refine((id) => COLLEGE_IDS.includes(id), "Unknown college");
