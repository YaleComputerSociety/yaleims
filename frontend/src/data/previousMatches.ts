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
    winner: "Benjamin Franklin",
    college1_participants: ["bf123", "bf234", "bf345"],
    college2_participants: ["br123", "br234", "br345"],
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
    winner: "Berkeley",
    college1_participants: ["bk123", "bk234", "bk345"],
    college2_participants: ["sy123", "sy234", "sy345"],
  },
  match_003: {
    matchId: "match_003",
    college1: "Davenport",
    college2: "Branford",
    sport: "Flag Football",
    date: "2024-08-29",
    time: "19:00",
    location: "Field 2",
    ref_id: null,
    winner: "Forfeit",
    college1_participants: ["dv123", "dv234", "dv345"],
    college2_participants: ["br123", "br234", "br567"],
  },
  match_004: {
    matchId: "match_004",
    college1: "Timothy Dwight",
    college2: "Branford",
    sport: "Flag Football",
    date: "2024-08-29",
    time: "19:00",
    location: "Field 3",
    ref_id: null,
    winner: "Forfeit",
    college1_participants: ["td123", "td234", "td345"],
    college2_participants: ["br567", "br678", "br789"],
  },
};
