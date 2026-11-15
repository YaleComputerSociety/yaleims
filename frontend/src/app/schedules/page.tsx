import { redirect } from "next/navigation";

/** The old schedule page: signing up happens on /sign-up and on a game's page now (GAMES-REDESIGN-PLAN §2.2a). */
export default function SchedulesPage() {
  redirect("/sign-up");
}
