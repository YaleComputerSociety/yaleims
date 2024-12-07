// Define types for the sports
type Sport = {
    id: string;
    name: string;
    points_for_win: number;
    emoji: string;
    season: Record<string, string>; // This allows for multiple seasons if needed
  };
  
// Define types for the college map
type CollegeMap = Record<string, string>; // Map of abbreviation to full name
type SportMap = Record<string, number>;
type EmojiMap = Record<string, string>

// List of sports with the proper type
export const sports: Sport[] = [
{ id: "1", name: "Soccer", points_for_win: 11, emoji: "⚽", season: { "2024-2025": "Fall" } },
{ id: "2", name: "Flag Football", points_for_win: 6, emoji: "🏈", season: { "2024-2025": "Fall" } },
{ id: "3", name: "Spikeball", points_for_win: 6, emoji: "🤾", season: { "2024-2025": "Fall" } },
{ id: "4", name: "Cornhole", points_for_win: 6, emoji: "🌽", season: { "2024-2025": "Fall" } },
{ id: "5", name: "Pickleball", points_for_win: 6, emoji: "🥒", season: { "2024-2025": "Fall" } },
{ id: "6", name: "Table Tennis", points_for_win: 8, emoji: "🏓", season: { "2024-2025": "Fall" } }
];

export const sportsMap: SportMap = {
"Flag Football": 6,
"Spikeball": 6,
"Cornhole": 6,
"Pickleball": 6,
"Table Tennis": 8,
"Soccer": 11
};

export const emojiMap: EmojiMap = {
"Flag Football": "🏈",
"Spikeball": "🤾",
"Cornhole": "🌽",
"Pickleball": "🥒",
"Table Tennis": "🏓",
"Soccer": "⚽"
}


// College abbreviations mapped to full college names (fixed keys)
export const toCollegeName: CollegeMap = {
"BF": "Benjamin Franklin",
"BK": "Berkeley",
"BR": "Branford",  // Changed "BF" to "BC" to make it unique
"DC": "Davenport",
"ES": "Ezra Stiles",
"GH": "Grace Hopper",
"JE": "Jonathan Edwards",
"MC": "Morse",
"MY": "Pauli Murray",
"PC": "Pierson",
"SY": "Saybrook",
"SM": "Silliman",
"TD": "Timothy Dwight",
"TC": "Trumbull"
};

// College abbreviations mapped to full college names (fixed keys)
export const toCollegeAbbreviation: Record<string, string> = {
  "Benjamin Franklin": "BF",
  "Berkeley": "BK",
  "Branford": "BR",
  "Davenport": "DC",
  "Ezra Stiles": "ES",
  "Grace Hopper": "GH",
  "Jonathan Edwards": "JE",
  "Morse": "MC",
  "Pauli Murray": "MY",
  "Pierson": "PC",
  "Saybrook": "SY",
  "Silliman": "SM",
  "Timothy Dwight": "TD",
  "Trumbull": "TC"
};
    
  



  