import { redirect } from "next/navigation";

/** The old "Scores and Rankings" page: scored games are a filter of the games list now (GAMES-REDESIGN-PLAN §2.7). */
export default function ScoresPage() {
  redirect("/games?status=scored");
}
