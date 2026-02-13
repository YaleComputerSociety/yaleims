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


export interface Odds {
  team1Win: number;
  team2Win: number;
  draw: number;
  forfeit: number;
}

export function oddsCalculator(
  team1WinPercentage: number,
  team2WinPercentage: number,
  bettingVolume: {
    team1: number;
    team2: number;
    draw: number;
    forfeit: number;
  },
  team1ForfeitRate: number,
  team2ForfeitRate: number
): Odds {
  const def = { team1Win: 0.35, team2Win: 0.35, draw: 0.1, forfeit: 0.2 };
  const total =
    bettingVolume.team1 +
    bettingVolume.team2 +
    bettingVolume.draw +
    bettingVolume.forfeit;
  const weight = total > 0 ? 1 : 0;
  const share = {
    team1: total ? bettingVolume.team1 / total : def.team1Win,
    team2: total ? bettingVolume.team2 / total : def.team2Win,
    draw: total ? bettingVolume.draw / total : def.draw,
    forfeit: total ? bettingVolume.forfeit / total : def.forfeit,
  };
  const pastW = 5;
  const rawDraw = 1 - team1WinPercentage - team2WinPercentage;
  const e1 = Math.exp(team1WinPercentage),
    e2 = Math.exp(team2WinPercentage),
    eD = Math.exp(rawDraw);
  const sum = e1 + e2 + eD;
  const n1 = e1 / sum,
    n2 = e2 / sum,
    nD = eD / sum;
  const remForfeit = Math.max(0.05, 1 - n1 - n2 - nD);
  const nF = Math.max(0.05, remForfeit - team1ForfeitRate - team2ForfeitRate);
  const mix = (perf: number, s: number) =>
    (perf * pastW + s * weight) / (pastW + weight || 1);
  const t1 = mix(n1, share.team1),
    t2 = mix(n2, share.team2),
    dr = mix(nD, share.draw),
    fr = mix(nF, share.forfeit),
    tot = t1 + t2 + dr + fr;
  return {
    team1Win: tot ? t1 / tot : def.team1Win,
    team2Win: tot ? t2 / tot : def.team2Win,
    draw: tot ? dr / tot : def.draw,
    forfeit: tot ? fr / tot : def.forfeit,
  };
}