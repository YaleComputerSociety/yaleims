export interface Match {
  matchId: string; // Unique identifier for the match
  college1: string;
  college2: string;
  sport: string;
  date: string;
  time: string;
  location: string;
  ref_id: string | null;
  winner: string | null;
  college1_participants: string[]; // List of participants from college1
  college2_participants: string[]; // List of participants from college2
}

export const matches: { [key: string]: Match } = {
  match_001: {
    matchId: "match_001",
    college1: "Benjamin Franklin",
    college2: "Branford",
    sport: "Soccer",
    date: "2024-09-01",
    time: "09:00",
    location: "Field 1",
    ref_id: null,
    winner: null,
    college1_participants: [],
    college2_participants: [],
  },
  match_002: {
    matchId: "match_002",
    college1: "Berkeley",
    college2: "Saybrook",
    sport: "Flag Football",
    date: "2024-09-01",
    time: "10:00",
    location: "Field 2",
    ref_id: null,
    winner: null,
    college1_participants: [],
    college2_participants: [],
  },
  // Add more matches as needed
};
