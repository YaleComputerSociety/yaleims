"use client";
// The notice for a signed-in person without a verified college this season
// (account plan, step 6): once per person and season in this browser; the
// Profile keeps the details and "Check Yalies again". Dismissing it is only
// presentation: what someone may do is decided on the server. Not shown on
// the Profile itself, nor without an active season.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { useSeason } from "@/context/SeasonContext";
import { NameForm } from "@/components/profile/CollegeAffiliation";

const RULES = "https://recreation.yale.edu/undergradims/guidelines-policies-sport-rules";

/** Whether the notice was dismissed (browser storage can be off: then it shows again next visit). */
function wasDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

function rememberDismissed(key: string): void {
  try {
    localStorage.setItem(key, new Date().toISOString());
  } catch {
    // Not remembered: it shows again next visit.
  }
}

export default function AffiliationNotice() {
  const { viewer } = useSession();
  const { currentSeason } = useSeason();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const key = viewer && currentSeason ? `yims:affiliation-notice:v1:${viewer.userId}:${currentSeason.id}` : null;
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => setDismissed(key ? wasDismissed(key) : true), [key]);

  const open = !!key && viewer?.collegeId === null && !dismissed && pathname !== "/profile";
  useEffect(() => {
    const element = dialog.current;
    if (open && element && !element.open) element.showModal();
    if (!open && element?.open) element.close();
  }, [open]);

  const dismiss = () => {
    if (key) rememberDismissed(key);
    setDismissed(true);
  };

  return (
    <dialog
      ref={dialog}
      onClose={dismiss}
      aria-labelledby="affiliation-notice-title"
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-xl p-6 bg-white text-black dark:bg-neutral-900 dark:text-white backdrop:bg-black/50 space-y-3"
    >
      <h2 id="affiliation-notice-title" className="text-lg font-semibold">We couldn&apos;t verify your residential college.</h2>
      <p className="text-sm">
        Your Yale sign-in succeeded. You can browse games, schedules, and scores. Signing yourself up requires a verified
        residential college affiliation.
      </p>
      <p className="text-sm">
        This is Yale&apos;s undergraduate intramural program. Participation is generally for currently enrolled Yale College
        students, with limited exceptions under{" "}
        <a href={RULES} target="_blank" rel="noreferrer" className="underline">Yale&apos;s eligibility rules</a>.
      </p>
      <p className="text-sm">
        If you&apos;re an undergraduate, you can try the Yalies search again later from Profile → College affiliation →
        Check Yalies again, or request manual review of your affiliation.
      </p>
      {viewer?.canEditName && <NameForm />}
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Link href="/profile?review=affiliation#review" onClick={dismiss} className="px-3 py-1.5 text-sm rounded-md bg-gray-200 dark:bg-gray-700">
          Request affiliation review
        </Link>
        <Link href="/profile" onClick={dismiss} className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white">
          Go to Profile
        </Link>
        <button type="button" autoFocus onClick={() => dialog.current?.close()} className="px-3 py-1.5 text-sm rounded-md bg-gray-200 dark:bg-gray-700">
          Continue browsing
        </button>
      </div>
    </dialog>
  );
}
