import { redirect } from "next/navigation";

/** The tournaments admin page moved with the rename to Special Events (GAMES-REDESIGN-PLAN §2.5). */
export default function UploadTournamentsPage() {
  redirect("/hub/events");
}
