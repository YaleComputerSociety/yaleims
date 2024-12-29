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
  winner: string | null; // Determines the winner, or if it's a draw
  forfeit: boolean;
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
  handleCollegeClick: (college: string) => void;
}

export interface TableHeaderProps {
  handleFilterChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

export interface TableRowProps {
  match: Match; // match prop should be typed as a Match
  // onShowParticipants: (match: Match) => void; // onShowParticipants function prop
  handleCollegeClick: (college: string) => void;
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

// Define the context type

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
