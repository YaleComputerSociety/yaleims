"use client";
// The Profile's name: the viewer's name (their NetID when none is known) and,
// while it's theirs to set (the session's canEditName: none yet, one they
// typed, or a captain's label), the field to set it. NameForm is also the
// optional name field of the sign-in notice (layout/AffiliationNotice).
import { useState } from "react";
import { useSession } from "@/context/SessionContext";
import { changeMe } from "@/lib/api/me";

export default function YourName() {
  const { viewer } = useSession();
  if (!viewer) return null;
  return (
    <section aria-labelledby="name-heading" className="p-6 bg-white dark:bg-black shadow-lg rounded-lg space-y-3 w-full max-w-md">
      <h2 id="name-heading" className="text-lg font-semibold">Name</h2>
      <p className="text-sm">{viewer.name}</p>
      {viewer.canEditName ? (
        <NameForm />
      ) : (
        <p className="text-xs text-gray-600 dark:text-gray-400">
          From the Yale directory or an admin. If it&apos;s wrong, ask an admin to check it (below).
        </p>
      )}
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
