import type { BracketUpload, MatchJson, SlotInput, UnscoredMatch } from "./api";
import type { CollegeDoc } from "./firestore";

export type Sport = {
  id: string;
  name: string;
  points_for_win: number;
  emoji: string;
  season: Record<string, string>; // This allows for multiple seasons if needed
};

// Define the type for the filters
export interface Filters {
  college: string;
  sport: string;
  date: string;
  selected: string;
}

export interface FiltersContextType {
  filter: Filters;
  setFilter: React.Dispatch<React.SetStateAction<Filters>>;
  resetFilters: () => void;
}

export interface SportModalProps {
  sport: string | null;
  setSport: (sport: string | null) => void;
}

export interface SportInfo {
  points: number;
  description: string;
  players: number;
}

export interface SportCardProps {
  sport: string;
  displayName?: boolean;
  handleClick?: (sport: string) => void;
  active?: boolean;
}

export interface BracketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BracketUpload) => void;
  sport: string;
  loading: boolean;
}

/** A row of the bracket/tournament upload forms: a slot plus the fields it is edited in. */
export interface ParsedMatch extends SlotInput {
  division: string;
  date?: string;
  time?: string;
}

/** The bracket upload form's data: an upload whose slots are form rows. */
export type BracketForm = Omit<BracketUpload, "matches"> & { matches: ParsedMatch[] };
