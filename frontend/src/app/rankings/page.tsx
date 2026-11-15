import { redirect } from "next/navigation";

/** The old "Power Rankings" page showed made-up ratings; standings by sport live on the leaderboard (GAMES-REDESIGN-PLAN §2.6). */
export default function RankingsPage() {
  redirect("/");
}
