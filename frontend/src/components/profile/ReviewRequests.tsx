"use client";
// The Profile's review requests (account plan, step 9): ask an admin to check
// your college, a game's attendance (a game you're missing from too) or your
// name, and see their answers. Private: only you and admins see them.
// /profile?review=affiliation (the sign-in notice's link) opens the form
// with that kind.
import { useCallback, useEffect, useRef, useState } from "react";
import { useSeason } from "@/context/SeasonContext";
import { fetchMyMatches, type MyMatch } from "@/lib/api/me";
import { fetchOwnReviews, requestReview, REVIEW_KINDS, REVIEW_STATUSES, type NewReview, type OwnReview } from "@/lib/api/reviews";
import type { ReviewKind } from "@/types/firestore";

const date = (iso: string) => new Date(iso).toLocaleDateString([], { dateStyle: "medium" });
const field = "w-full rounded-md px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 dark:bg-black";

export default function ReviewRequests() {
  const { currentSeason } = useSeason();
  const [requests, setRequests] = useState<OwnReview[]>([]);
  const [games, setGames] = useState<MyMatch[]>([]);
  const [kind, setKind] = useState<ReviewKind | null>(null);
  const [matchId, setMatchId] = useState(""); // a game of theirs, or "other": one they're not listed on, described in the message
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const section = useRef<HTMLElement>(null);

  const load = useCallback(() => fetchOwnReviews().then(({ items }) => setRequests(items), () => {}), []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (currentSeason) fetchMyMatches({ seasonId: currentSeason.id }).then(({ items }) => setGames(items), () => {});
  }, [currentSeason]);
  // The sign-in notice's link: open the form with that kind.
  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get("review");
    if (asked && asked in REVIEW_KINDS) {
      setKind(asked as ReviewKind);
      section.current?.scrollIntoView();
    }
  }, []);

  if (!currentSeason) return null;

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!kind) return;
    setState("sending");
    setError(null);
    const review: NewReview =
      kind === "attendance" ? { kind, ...(matchId === "other" ? {} : { matchId }), message } : { kind, message };
    try {
      await requestReview(review);
      setState("sent");
      setKind(null);
      setMessage("");
      setMatchId("");
      await load();
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  };

  return (
    <section ref={section} id="review" aria-labelledby="review-heading" className="p-6 bg-white dark:bg-black shadow-lg rounded-lg space-y-3 w-full max-w-md">
      <h2 id="review-heading" className="text-lg font-semibold">Ask an admin to check something</h2>
      {requests.map((r) => (
        <p key={r.id} className="text-sm">
          {REVIEW_KINDS[r.kind]} · <strong>{REVIEW_STATUSES[r.status]}</strong> · {date(r.createdAt)}
          {r.resolution && <span className="block">Answer: {r.resolution}</span>}
        </p>
      ))}
      {state === "sent" && <p role="status" className="text-sm">Sent. The answer shows here.</p>}
      {kind === null ? (
        <div className="flex flex-wrap gap-2">
          {(Object.keys(REVIEW_KINDS) as ReviewKind[]).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className="px-3 py-1 text-sm rounded-md bg-gray-200 dark:bg-gray-700">
              {k === "affiliation" ? "Request affiliation review" : k === "attendance" ? "A game's attendance is wrong" : "My name is wrong"}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={send} className="space-y-2">
          <p className="text-sm font-medium">{REVIEW_KINDS[kind]}</p>
          {kind === "attendance" && (
            <label className="block text-sm">
              The game
              <select className={field} value={matchId} onChange={(e) => setMatchId(e.target.value)} required>
                <option value="">Choose…</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {date(g.startsAt)}: {g.homeCollegeId ?? "TBD"} vs {g.awayCollegeId ?? "TBD"}
                  </option>
                ))}
                <option value="other">A game I&apos;m not listed on</option>
              </select>
            </label>
          )}
          <label className="block text-sm">
            {kind === "affiliation"
              ? "Your residential college, and anything that helps check it"
              : kind === "profile"
                ? "Your name as it should be"
                : matchId === "other"
                  ? "Which game (date, sport, colleges) and what's wrong"
                  : "What's wrong"}
            <textarea className={field} rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} required />
          </label>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={state === "sending" || !message.trim()} className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white disabled:opacity-50">
              {state === "sending" ? "Sending…" : "Send"}
            </button>
            <button type="button" onClick={() => setKind(null)} className="px-3 py-1.5 text-sm rounded-md bg-gray-200 dark:bg-gray-700">Cancel</button>
          </div>
        </form>
      )}
    </section>
  );
}
