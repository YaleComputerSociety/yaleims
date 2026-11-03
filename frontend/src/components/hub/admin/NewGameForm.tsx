"use client";
// Adds one regular-season game to the current season (supervisors): the
// same call as a schedule upload, with one game. The date and time are read
// in the browser's time zone, as in the edit form.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useSeason } from "@/context/SeasonContext";
import { uploadSchedule } from "@/lib/api/matches";
import { COLLEGES } from "@/lib/colleges";

const field =
  "w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400";

export default function NewGameForm() {
  const { currentSeason } = useSeason();
  const router = useRouter();
  const sports = currentSeason?.sports ?? [];
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentSeason) return;
    const form = new FormData(e.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const startsAt = new Date(`${value("date")}T${value("time")}`);
    if (isNaN(startsAt.getTime())) return toast.error("Pick a date and a time.");
    if (value("home") === value("away")) return toast.error("A college can't play itself.");

    setSaving(true);
    try {
      const { matchIds } = await uploadSchedule(currentSeason.id, {
        sportId: value("sport"),
        matches: [
          {
            startsAt: startsAt.toISOString(),
            homeCollegeId: value("home"),
            awayCollegeId: value("away"),
            venue: value("venue") || null,
            venueDetail: value("venueDetail") || null,
          },
        ],
      });
      toast.success("Game added.");
      router.push(`/hub/games/${currentSeason.id}/${matchIds[0]}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3">
      <label className="col-span-2 flex flex-col gap-1 text-sm font-medium">
        Sport
        <select name="sport" required className={field} defaultValue="">
          <option value="" disabled>
            Select a sport
          </option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.emoji} {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Date
        <input name="date" type="date" required className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Time
        <input name="time" type="time" required className={field} />
      </label>
      {(["home", "away"] as const).map((side) => (
        <label key={side} className="flex flex-col gap-1 text-sm font-medium">
          {side === "home" ? "Home" : "Away"}
          <select name={side} required className={field} defaultValue="">
            <option value="" disabled>
              College
            </option>
            {COLLEGES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Venue
        <input name="venue" placeholder="e.g. Payne Whitney" maxLength={200} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Field / court
        <input name="venueDetail" placeholder="optional" maxLength={200} className={field} />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="col-span-2 mt-1 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
      >
        {saving ? "Adding…" : "Add game"}
      </button>
    </form>
  );
}
