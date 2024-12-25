

  const fetchScores = async () => {
    try {
      const response = await fetch(
        "https://us-central1-yims-125a2.cloudfunctions.net/getMatches?type=past", // Pass 'type=past' to get past matches
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error fetching scores: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch scores:", error);
    }
  };
  
  const matches = await fetchScores()


  const calculateCollegeStats = (matches) => {
    const stats = {};
  
    matches.forEach(match => {
      const { 
        home_college, 
        away_college, 
        home_college_score, 
        away_college_score, 
        forfeit, 
        winner 
      } = match;
  
      // Ensure colleges exist in stats
      if (!stats[home_college]) stats[home_college] = { games: 0, wins: 0, ties: 0, losses: 0, forfeits: 0 };
      if (!stats[away_college]) stats[away_college] = { games: 0, wins: 0, ties: 0, losses: 0, forfeits: 0 };
  
      // Update games and forfeits
      stats[home_college].games++;
      stats[away_college].games++;
      if (forfeit) {
        stats[winner === home_college ? away_college : home_college].forfeits++;
        stats[winner].wins++;
        stats[winner === home_college ? away_college : home_college].losses++;
        return;
      }
  
      // Update wins, ties, losses
      if (home_college_score === away_college_score) {
        stats[home_college].ties++;
        stats[away_college].ties++;
      } else {
        const isHomeWinner = home_college_score > away_college_score;
        stats[isHomeWinner ? home_college : away_college].wins++;
        stats[isHomeWinner ? away_college : home_college].losses++;
      }
    });
  
    return stats;
  };
  
  // Example usage
  const stats = calculateCollegeStats(matches);
  console.log(stats);
  