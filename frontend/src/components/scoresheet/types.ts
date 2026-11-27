// What a printed scoresheet shows: the game, both teams and their rosters.

export interface Player {
  /** The "ID #" column: a NetID or student ID number. */
  netId: string;
  name: string;
  /** The "#" column; blank when unknown. */
  jerseyNumber?: string;
  /** The "GP" column: games played this season; blank when unknown. */
  gamesPlayed?: number;
  /** The "Status" column: G, M, S and/or W (see the sheet's legend); blank when clear. */
  status?: string;
}

export interface TeamRecord {
  wins: number;
  losses: number;
  ties: number;
}

export interface Team {
  name: string;
  /** Left off for a side not known yet (TBD). */
  record?: TeamRecord;
  players: Player[];
}

export interface Game {
  /** Printed as "Game 13"; left off when the schedule has none. */
  gameNumber?: string;
  /** As the badge reads: "Basketball", "Flag Football", "Indoor Soccer". */
  sport: string;
  /** Printed under the badge, e.g. "Undergrad IM Spikeball". */
  league?: string;
  division?: string;
  /** ISO date-time; printed in Eastern time, the league's. */
  startsAt: string;
  location: string;
  home: Team;
  away: Team;
}
