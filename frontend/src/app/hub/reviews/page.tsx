"use client";
// Review requests (admins; decision 3d): what people asked about their
// college, a game's attendance or their name, newest first. An admin makes
// the correction in People, then resolves (or dismisses) the request with an
// answer the person sees on their Profile.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import PageHeading from "@/components/layout/PageHeading";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import PersonName from "@/components/ui/PersonName";
import withRoleProtectedRoute from "@/components/hub/withRoleProtectedRoute";
import { closeReview, fetchReviewQueue, REVIEW_KINDS, REVIEW_STATUSES, type QueuedReview } from "@/lib/api/reviews";
import type { ReviewStatus } from "@/types/firestore";

const time = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

function ReviewsPage() {
  const [status, setStatus] = useState<ReviewStatus>("open");
  const [items, setItems] = useState<QueuedReview[] | null>(null);

  const load = useCallback(async () => {
    try {
      setItems((await fetchReviewQueue(status)).items);
    } catch (err) {
      toast.error((err as Error).message);
      setItems([]);
    }
  }, [status]);
  useEffect(() => {
    setItems(null);
    load();
  }, [load]);

  return (
    <div className="min-h-screen pt-20 pb-12">
      <PageHeading heading="Review Requests" />
      <div className="max-w-3xl mx-auto px-4 space-y-4">
        <div className="flex gap-2" role="tablist">
          {(Object.keys(REVIEW_STATUSES) as ReviewStatus[]).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={s === status}
              onClick={() => setStatus(s)}
              className={`px-3 py-1 text-sm rounded-full ${s === status ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-800"}`}
            >
              {REVIEW_STATUSES[s]}
            </button>
          ))}
        </div>
        {items === null && <div className="flex justify-center py-6"><LoadingSpinner /></div>}
        {items?.length === 0 && <p className="text-sm text-gray-500">None.</p>}
        {items?.map((r) => <Request key={r.id} request={r} onClosed={load} />)}
      </div>
    </div>
  );
}

function Request({ request: r, onClosed }: { request: QueuedReview; onClosed: () => void }) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const close = async (status: "resolved" | "dismissed") => {
    setBusy(true);
    try {
      await closeReview(r.id, { status, resolution: answer.trim(), revision: r.revision });
      onClosed();
    } catch (err) {
      toast.error((err as Error).message);
      onClosed();
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-gray-950 p-4 space-y-2 text-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">
          {REVIEW_KINDS[r.kind]} ·{" "}
          <Link href={`/hub/people?user=${encodeURIComponent(r.subject.userId)}`} className="underline">
            <PersonName person={r.subject} />
          </Link>
        </span>
        <span className="text-xs text-gray-500">{time(r.createdAt)} · {r.seasonId}{r.matchId ? ` · game ${r.matchId}` : ""}</span>
      </header>
      <p className="whitespace-pre-wrap">{r.message}</p>
      {r.status === "open" ? (
        <div className="space-y-2">
          <textarea
            className="w-full rounded-md px-2 py-1 bg-white dark:bg-black ring-1 ring-black/10 dark:ring-white/10"
            rows={2}
            maxLength={500}
            placeholder="The answer they will see"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-600 text-white disabled:opacity-50" disabled={busy || !answer.trim()} onClick={() => close("resolved")}>
              Resolve
            </button>
            <button className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-600 text-white disabled:opacity-50" disabled={busy || !answer.trim()} onClick={() => close("dismissed")}>
              Dismiss
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">Answer{r.resolvedBy ? ` (${r.resolvedBy})` : ""}: {r.resolution}</p>
      )}
    </article>
  );
}

export default withRoleProtectedRoute(ReviewsPage, (viewer) => viewer.can.managePeople);
