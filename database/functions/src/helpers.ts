export interface DecodedToken {
  name: string;
  netid: string;
  email: string;
  role: string;
  mRoles: string[];
  username: string;
  college: string;
  points: string;
  matches_played: number;
}

export function isValidDecodedToken(decoded: any): decoded is DecodedToken {
  return (
    typeof decoded === "object" &&
    typeof decoded.netid === "string" &&
    typeof decoded.email === "string"
  );
}


export interface Sport {
  id: number;
  name: string;
  points: number;
  season: string;
  emoji: string;
}

export const sports: { [key: string]: Sport } = {
  Soccer: { id: 1, name: "Soccer", points: 11, season: "fall", emoji: "⚽" },
  "Flag Football": {
    id: 2,
    name: "Flag Football",
    points: 6,
    season: "fall",
    emoji: "🏈",
  },
  Spikeball: {
    id: 3,
    name: "Spikeball",
    points: 6,
    season: "fall",
    emoji: "🦔",
  },
  Cornhole: { id: 4, name: "Cornhole", points: 6, season: "fall", emoji: "🌽" },
  Pickleball: {
    id: 5,
    name: "Pickleball",
    points: 6,
    season: "fall",
    emoji: "🥒",
  },
  "Table Tennis": {
    id: 6,
    name: "Table Tennis",
    points: 10,
    season: "fall",
    emoji: "🏓",
  },
  "W-Hoops": {
    id: 7,
    name: "W-Hoops",
    points: 5,
    season: "winter",
    emoji: "🏀",
  },
  "M-Hoops": {
    id: 8,
    name: "M-Hoops",
    points: 5,
    season: "winter",
    emoji: "🏀",
  },
  "C-Hoops": {
    id: 9,
    name: "C-Hoops",
    points: 5,
    season: "winter",
    emoji: "🏀",
  },
  Dodgeball: {
    id: 10,
    name: "Dodgeball",
    points: 8,
    season: "winter",
    emoji: "🤾",
  },
  Broomball: {
    id: 11,
    name: "Broomball",
    points: 6,
    season: "winter",
    emoji: "🧹",
  },
  "Indoor Soccer": {
    id: 12,
    name: "Indoor Soccer",
    points: 5,
    season: "spring",
    emoji: "🥅",
  },
  Volleyball: {
    id: 13,
    name: "Volleyball",
    points: 6,
    season: "spring",
    emoji: "🏐",
  },
  Badminton: {
    id: 14,
    name: "Badminton",
    points: 6,
    season: "spring",
    emoji: "🏸",
  },
};
