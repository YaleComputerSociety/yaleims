"use client";

import React, { useEffect, useState } from "react";
import { useSeason } from "@/context/SeasonContext";
import { useChampionship } from "@/hooks/useChampionship";
import { setChampion } from "@/lib/api/seasons";
import { COLLEGES } from "@/lib/colleges";
import { getCollegeFlag } from "@/utils/versionedImages";
import { toast } from "react-toastify";
import { FaSpinner } from "react-icons/fa";

const ChampionControls: React.FC = () => {
  const [winningCollegeId, setWinningCollegeId] = useState<string>("");
  const [celebrationActive, setCelebrationActive] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const stored = useChampionship();
  const seasonId = useSeason().currentSeason?.id;
  const loaded = stored.loaded;

  // Follow the stored banner (live), including saves from elsewhere.
  useEffect(() => {
    if (!stored.loaded) return;
    setWinningCollegeId(stored.championCollegeId ?? "");
    setCelebrationActive(stored.celebrationActive);
  }, [stored.loaded, stored.championCollegeId, stored.celebrationActive]);

  const save = async (next: { winningCollegeId: string; celebrationActive: boolean }) => {
    if (next.celebrationActive && !next.winningCollegeId) {
      toast.error("Pick a winning college first.");
      return;
    }
    if (!seasonId) return;
    setSaving(true);
    try {
      await setChampion(seasonId, {
        championCollegeId: next.winningCollegeId || null,
        celebrationActive: next.celebrationActive,
      });
      toast.success("Championship updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onCollegeChange = (id: string) => {
    setWinningCollegeId(id);
    save({ winningCollegeId: id, celebrationActive });
  };

  const onToggle = () => {
    const next = !celebrationActive;
    setCelebrationActive(next);
    save({ winningCollegeId, celebrationActive: next });
  };

  const selected = COLLEGES.find((c) => c.id === winningCollegeId);

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-8">
        <FaSpinner className="animate-spin text-2xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label className="block text-sm font-medium mb-2">Winning College</label>
        <select
          value={winningCollegeId}
          onChange={(e) => onCollegeChange(e.target.value)}
          disabled={saving}
          className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black/30 px-3 py-2 text-sm"
        >
          <option value="">— Select a college —</option>
          {COLLEGES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="flex items-center gap-4 rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] p-4">
          <img
            src={getCollegeFlag(selected.name)}
            alt={selected.name}
            className="w-16 h-16 object-contain"
          />
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Current pick</div>
            <div className="text-lg font-semibold">{selected.name}</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.03] p-4">
        <div>
          <div className="font-medium">Celebration active</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Shows the confetti reveal and champion banner on the leaderboard.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={celebrationActive}
          onClick={onToggle}
          disabled={saving || (!celebrationActive && !winningCollegeId)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
            celebrationActive ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              celebrationActive ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {saving && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <FaSpinner className="animate-spin" /> Saving…
        </div>
      )}
    </div>
  );
};

export default ChampionControls;
