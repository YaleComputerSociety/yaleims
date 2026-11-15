import { redirect } from "next/navigation";

/** "Tournaments" became "Special Events" (GAMES-REDESIGN-PLAN §2.5); older links still work. */
export default function TournamentsPage() {
  redirect("/events");
}
