export interface Sport {
    id: number;
    name: string;
    points: number;
    season: string;
    emoji: string;
  }
  
  export const sports: { [key: string]: Sport } = {
    "1": { id: 1, name: "Soccer", points: 11, season: "fall", emoji: "⚽" },
    "2": { id: 2, name: "Flag Football", points: 6, season: "fall", emoji: "🏈" },
    "3": { id: 3, name: "Spikeball", points: 6, season: "fall", emoji: "🦔" },
    "4": { id: 4, name: "Cornhole", points: 6, season: "fall", emoji: "🌽" },
    "5": { id: 5, name: "Pickleball", points: 6, season: "fall", emoji: "🥒" },
    "6": { id: 6, name: "Ping Pong", points: 10, season: "fall", emoji: "🏓" },
    "7": { id: 7, name: "W-Hoops", points: 5, season: "winter", emoji: "🏀" },
    "8": { id: 8, name: "M-Hoops", points: 5, season: "winter", emoji: "🏀" },
    "9": { id: 9, name: "C-Hoops", points: 5, season: "winter", emoji: "🏀" },
    "10": { id: 10, name: "Dodgeball", points: 8, season: "winter", emoji: "🤾" },
    "11": { id: 11, name: "Broomball", points: 6, season: "winter", emoji: "🧹" },
    "12": { id: 12, name: "Indoor Soccer", points: 5, season: "spring", emoji: "🥅" },
    "13": { id: 13, name: "Volleyball", points: 6, season: "spring", emoji: "🏐" },
    "14": { id: 14, name: "Badminton", points: 6, season: "spring", emoji: "🏸" }
  };
  