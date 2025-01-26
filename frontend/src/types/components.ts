export interface CollegeStats {
  abbreviation: string;
  name: string;
  points: number;
  forfeits: number;
  games: number;
  losses: number;
  rank: number;
  ties: number;
  wins: number;
}

export interface CollegeSummaryCardProps {
  stats: CollegeStats | null;
  isLoading: boolean;
}

export type Match = {
  id: string; // Unique identifier for the match
  home_college: string; // Abbreviation of the home college
  away_college: string; // Abbreviation of the away college
  home_college_score: number; // Score of the home college
  away_college_score: number; // Score of the away college
  home_college_participants: [];
  away_college_participants: [];
  sport: string; // The sport played in the match (e.g., "Flag Football")
  timestamp: string; // Date and time of the match, in ISO format or UNIX timestamp
  location: string; // The location where the match was played (optional)
  location_extra: string;
  type: string;
  division: string;
  winner: string | null; // Determines the winner, or if it's a draw
  forfeit: boolean;
  home_college_odds?: number;
  away_college_odds?: number;
  draw_odds?: number;
  default_odds?: number;
  home_volume?: number;
  away_volume?: number;
  draw_volume?: number;
  default_volume?: number;
};

export type Matchv2 = {
  id: string; // Unique identifier for the match
  home_college: string; // Abbreviation of the home college
  away_college: string; // Abbreviation of the away college
  home_college_score: number; // Score of the home college
  away_college_score: number; // Score of the away college
  home_college_participants: [];
  away_college_participants: [];
  sport: string; // The sport played in the match (e.g., "Flag Football")
  timestamp: { _seconds: number; _nanoseconds: number }; // Date and time of the match, in ISO format or UNIX timestamp
  location: string; // The location where the match was played (optional)
  winner: string | null; // Determines the winner, or if it's a draw
  forfeit: boolean;
};

export interface MatchCardProps {
  match: Matchv2;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface MatchesTableProps {
  filteredMatches: Match[]; // Type the filteredMatches prop as an array of Match
  handleCollegeClick?: (college: string) => void;
  handleSportClick?: (sport: string) => void;
  availablePoints?: number;
}

export interface PendingMatchesTableProps {
  pendingBets: Bet[];
}

export interface TableHeaderProps {
  handleFilterChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  filter: Filters;
  sortOrder: string;
  handleSortOrderChange: (newSortOrder: string) => void;
}

export interface TableRowProps {
  key?: number;
  match: Match; // `match` prop remains typed as `Match`
  handleCollegeClick: any; // Function to handle college clicks
  isFirst?: boolean; // Optional prop to indicate if this is the first row
  isLast?: boolean; // Optional prop to indicate if this is the last row
  handleSportClick: any; // Function to handle sport clicks
  availablePoints?: number;
}
export interface YoddsTableRowProps {
  key?: number;
  match: Match; // `match` prop remains typed as `Match`
  isFirst?: boolean; // Optional prop to indicate if this is the first row
  isLast?: boolean; // Optional prop to indicate if this is the last row
  availablePoints: number | undefined;
}

export interface TablePendingRowProps {
  key?: number;
  bet: Bet; // `match` prop remains typed as `Match`
  isFirst?: boolean; // Optional prop to indicate if this is the first row
  isLast?: boolean; // Optional prop to indicate if this is the last row
  availablePoints?: number | undefined;
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
    match: Match;
  }[];
  onMatchClick: (match: Match) => void;
}

export interface CalendarMatchListProps {
  matches: Match[];
}

export interface MatchSignUpProps {
  match: Match;
}

export interface CalendarFiltersProps {
  filter: { college: string; sport: string; date: Date };
  updateFilter: (
    key: keyof CalendarFiltersProps["filter"],
    value: string
  ) => void;
}

export interface Participant {
  email: string;
  firstname?: string;
  lastname?: string;
  name?: string;
  // Add other fields as needed
}

export interface Bet {
  away_college: string;
  betAmount: number;
  betOdds: number;
  betOption: string;
  home_college: string;
  matchId: string;
  sport: string;
  matchTimestamp: string;
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
  handleClick: (sport: string) => void;
}
