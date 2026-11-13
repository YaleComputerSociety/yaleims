"use client";
// The games page's Filters panel: college, kind (regular season, playoffs,
// tournaments) and status. The page owns the values (they live in the URL);
// this draws the controls.
import GlassDropdown from "@/components/ui/GlassDropdown";
import { COLLEGES } from "@/lib/colleges";
import type { CompetitionKind, StatusChoice } from "@/lib/games";

export interface SheetFilters {
  collegeId: string;
  kind: CompetitionKind | "";
  status: StatusChoice | "";
}

export const KINDS: { value: CompetitionKind; label: string }[] = [
  { value: "regular", label: "Regular season" },
  { value: "playoffs", label: "Playoffs" },
  { value: "tournament", label: "Tournaments" },
];

export const STATUSES: { value: StatusChoice; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "scored", label: "Scored" },
  { value: "unscored", label: "Not yet scored" },
  { value: "cancelled", label: "Cancelled" },
];

const isKind = (value: string): value is CompetitionKind => KINDS.some((k) => k.value === value);
const isStatus = (value: string): value is StatusChoice => STATUSES.some((s) => s.value === value);

export const NO_FILTERS: SheetFilters = { collegeId: "", kind: "", status: "" };

interface FiltersSheetProps {
  value: SheetFilters;
  onChange: (value: SheetFilters) => void;
}

export default function FiltersSheet({ value, onChange }: FiltersSheetProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] items-center rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3">
      <GlassDropdown
        placeholder="College"
        value={value.collegeId}
        options={COLLEGES.map((c) => ({ value: c.id, label: c.name }))}
        onChange={(collegeId) => onChange({ ...value, collegeId })}
      />
      <GlassDropdown placeholder="Kind" value={value.kind} options={KINDS} onChange={(kind) => onChange({ ...value, kind: isKind(kind) ? kind : "" })} />
      <GlassDropdown placeholder="Status" value={value.status} options={STATUSES} onChange={(status) => onChange({ ...value, status: isStatus(status) ? status : "" })} />
      <button type="button" onClick={() => onChange(NO_FILTERS)} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline justify-self-start sm:justify-self-end">
        Clear
      </button>
    </div>
  );
}
