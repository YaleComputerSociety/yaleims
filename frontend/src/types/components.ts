import type { MatchJson, UnscoredMatch } from "./api";
import type { CollegeStandingDoc, PlacementPoints } from "./firestore";

export interface CollegeSummaryCardProps {
  stats: CollegeStandingDoc | null;
  isLoading: boolean;
}

export interface MatchCardProps {
  match: UnscoredMatch;
  onScored?: (matchId: UnscoredMatch["id"]) => void;
}

export interface MatchesTableProps {
  filteredMatches: MatchJson[];
  handleCollegeClick?: (college: string) => void;
  handleSportClick?: (sport: string) => void;
}

export interface TableHeaderProps {
  handleFilterChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  filter: Filters;
  sortOrder: string;
  handleSortOrderChange: (newSortOrder: string) => void;
}

export interface TableRowProps {
  key?: number;
  match: MatchJson;
  handleCollegeClick: any; // Function to handle college clicks
  isFirst?: boolean; // Optional prop to indicate if this is the first row
  isLast?: boolean; // Optional prop to indicate if this is the last row
  handleSportClick: any; // Function to handle sport clicks
}

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

export interface PaginationProps {
  currentPageNumber: number;
  totalPages: number;
  setPageNumber: React.Dispatch<React.SetStateAction<number>>;
  setQueryType: React.Dispatch<React.SetStateAction<string>>;
}
export interface CalendarViewProps {
  events: {
    title: string;
    start: Date;
    end: Date;
    match: MatchJson;
  }[];
  onMatchClick: (match: MatchJson) => void;
}

/** A match whose start time the schedule list has parsed into a Date. */
export type ScheduleMatch = Omit<MatchJson, "timestamp"> & { timestamp: Date };

export interface CalendarMatchListProps {
  matches: MatchJson[];
  topDate: Date;
  setTopDate: React.Dispatch<React.SetStateAction<Date>>;
}

export interface MatchSignUpProps {
  match: MatchJson;
}

export interface CalendarFiltersProps {
  filter: { college: string; sport: string; date: Date };
  updateFilter: (
    key: keyof CalendarFiltersProps["filter"],
    value: string
  ) => void;
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
  onSave: (data: BracketData) => void;
  sport: string;
  loading: boolean;
}

export interface BracketData {
  sport: string;
  matches: ParsedMatch[];
}

export interface Team {
  college: string;
  seed: string | number;
  division: "green" | "blue" | "none";
  matchSlot: string | number;
  matchDatetime: string;
  location: string;
}

export interface ParsedMatch {
  match_slot: number;
  away_college: string;
  away_seed: number;
  home_college: string;
  home_seed: number;
  location: string;
  location_extra?: string;
  timestamp: string;
  division: string;
  date?: string;
  time?: string;
}

/** Payload the admin panel posts to createTournament. */
export interface TournamentData {
  name: string;
  sport: string;
  matches: ParsedMatch[];
  placement_points: PlacementPoints;
}
