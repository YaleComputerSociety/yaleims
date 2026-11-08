"use client";
// The Profile's college affiliation (account plan, step 6): this season's
// college or "unassigned", the last Yale directory lookup, "Check Yalies
// again" once its cooldown has passed, and the name while it is the
// viewer's to set (the directory has given none). NameForm is also the
// optional name field of the sign-in notice (layout/AffiliationNotice).
import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { useSeason } from "@/context/SeasonContext";
import { changeMe, refreshDirectory } from "@/lib/api/me";
import { collegeName } from "@/lib/colleges";
import type { DirectoryOutcome } from "@/types/firestore";

const OUTCOMES: Record<DirectoryOutcome, string> = {
  found: "The Yale directory (Yalies) found you.",
  partial: "The Yale directory (Yalies) found you, but without every detail.",
  "not-found": "The Yale directory (Yalies) doesn't list your NetID.",
  unavailable: "The Yale directory (Yalies) didn't answer.",
};

const time = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

export default function CollegeAffiliation() {
  const { viewer, refresh } = useSession();
  const { currentSeason } = useSeason();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const retryAt = viewer?.directory ? Date.parse(viewer.directory.retryAt) : 0;
  const [now, setNow] = useState(() => Date.now());

  // Re-render when the cooldown ends, so the button opens by itself.
  useEffect(() => {
    const wait = retryAt - Date.now();
    if (wait <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), wait + 500);
    return () => clearTimeout(timer);
  }, [retryAt]);

  if (!viewer) return null;
  const college = collegeName(viewer.collegeId);
  const coolingDown = retryAt > now;

  const checkAgain = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await refreshDirectory(); // its outcome shows in the "Last checked" line once the session is read again
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      await refresh();
      setNow(Date.now());
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="affiliation-heading" className="p-6 bg-white dark:bg-black shadow-lg rounded-lg space-y-3 w-full max-w-md">
      <h2 id="affiliation-heading" className="text-lg font-semibold">College affiliation</h2>
      {!currentSeason ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">There&apos;s no active season right now.</p>
      ) : college ? (
        <p className="text-sm">{college}, {currentSeason.id}</p>
      ) : (
        <p className="text-sm">
          <strong>Unassigned</strong> for {currentSeason.id}. Signing yourself up for games needs a verified residential
          college; a captain or supervisor can still add you to a game. You can also ask an admin to check it (below).
        </p>
      )}
      {viewer.directory?.outcome && viewer.directory.checkedAt && (
        <p role="status" className="text-xs text-gray-600 dark:text-gray-400">
          {OUTCOMES[viewer.directory.outcome]} Last checked {time(viewer.directory.checkedAt)}.
        </p>
      )}
      {(!college || viewer.canEditName) && (
        <button
          type="button"
          onClick={checkAgain}
          disabled={busy || coolingDown}
          className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white disabled:opacity-50"
        >
          {busy ? "Checking…" : coolingDown ? `Check Yalies again after ${time(viewer.directory!.retryAt)}` : "Check Yalies again"}
        </button>
      )}
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
      {viewer.canEditName && <NameForm />}
    </section>
  );
}

/** The viewer's name, while it is theirs to set; saved on request, with the error inline. */
export function NameForm() {
  const { viewer, refresh } = useSession();
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("saving");
    setError(null);
    try {
      await changeMe({ name });
      await refresh();
      setState("saved");
    } catch (err) {
      setError((err as Error).message);
      setState("idle");
    }
  };

  return (
    <form onSubmit={save} className="space-y-1">
      <label htmlFor="own-name" className="block text-sm font-medium">
        Your name <span className="font-normal text-gray-500">(optional; others see {viewer?.name} until the directory gives one)</span>
      </label>
      <div className="flex gap-2">
        <input
          id="own-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoComplete="name"
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-sm dark:bg-black"
        />
        <button type="submit" disabled={state === "saving" || !name.trim()} className="px-3 py-1 text-sm rounded-md bg-gray-800 text-white dark:bg-gray-200 dark:text-black disabled:opacity-50">
          {state === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {state === "saved" && !error && <p role="status" className="text-sm">Saved.</p>}
    </form>
  );
}
