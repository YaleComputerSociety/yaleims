import fs from 'fs';
import csv from 'csv-parser';
import { firestore } from './firebase.js'; // Assuming you're exporting Firestore from your firebase.js file
import { doc, setDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';

const SPORT = 'Cornhole';
const SPORT_POINTS = 6;
const FILE_NAME = "data/cornhole.csv"
const YEAR = "2024";

// Helper function to combine date and time into a Firestore Timestamp
const convertToTimestamp = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null; // Return null if either is missing
  
  // Combine date and time into a single string (e.g., "2024-09-10 4:00 PM")
  const dateTimeStr = `${dateStr} ${timeStr}`;
  
  // Convert the combined date and time string into a Date object
  const dateTime = new Date(dateTimeStr);
  
  // Return the Firestore Timestamp
  return Timestamp.fromDate(dateTime);
};


// Function to handle adding matches and updating points
const processMatches = async (matches) => {
  for (const match of matches) {
    // Update Firestore with the match data
    const matchDateTime = convertToTimestamp(match.date, match.time);
    const matchDate = new Date(match.date); // Convert match.date into a Date object

    // Check if this match is a "bye" and construct the document ID accordingly
    let matchId;
    if (!match.away_college) {
      // Use the custom document ID format for "bye" matches
      matchId = `NO_DATE-BYE-${SPORT}-${YEAR}-${match.home_college}`;
    } else {
      // Use date-based document ID for regular matches
      matchId = `${match.home_college}-${match.away_college}-${matchDate.toISOString()}`;
    }

    const matchRef = doc(firestore, 'matches', `${matchId}`);    await setDoc(matchRef, {
      home_college: match.home_college,
      away_college: match.away_college,
      home_college_score: match.home_college_score || 0,
      away_college_score: match.away_college_score || 0,
      sport: SPORT,
      winner: match.winner,
      forfeit: match.forfeit === 'Yes',
      timestamp: matchDateTime,
      location: match.location,
      home_college_participants: [],
      away_college_participants: [],
    });

    if (match.winner == "Draw") {
      const homeCollegeRef = doc(firestore, 'colleges', match.home_college);
      const awayCollegeRef = doc(firestore, 'colleges', match.away_college);

      await updateDoc(homeCollegeRef, {
          points: increment(SPORT_POINTS/2)
      })

      await updateDoc(awayCollegeRef, {
        points: increment(SPORT_POINTS/2)
      })
      
      console.log(`Draw between ${match.home_college} and ${match.away_college} accounted`)

    } else if (match.winner != "Forfeit") {
      const winnerCollegeRef = doc(firestore, 'colleges', match.winner);
      await updateDoc(winnerCollegeRef, {
        points: increment(SPORT_POINTS)
     })
     console.log(`Win for ${match.winner} accounted`)
    } else {
      const homeCollegeRef = doc(firestore, 'colleges', match.home_college);
      const awayCollegeRef = doc(firestore, 'colleges', match.away_college);
      await updateDoc(homeCollegeRef, {
        forfeit_count: increment(1)
      })
      await updateDoc(awayCollegeRef, {
        forfeit_count: increment(1)
      })
      console.log(`Forfeit between ${match.home_college} and ${match.away_college} accounted`)

    }

    if (match.forfeit == "Yes" && match.winner != "Forfeit") {
      const loser =  match.home_college != match.winner ? match.home_college : match.away_college;
      const loserCollegeRef = doc(firestore, 'colleges', loser);
      await updateDoc(loserCollegeRef, {
        forfeit_count: increment(1)
      })
      console.log(`${loser} forfeit counted`)
    }
  }


};

// Parse the CSV file
const matches = [];

fs.createReadStream(FILE_NAME)
  .pipe(csv())
  .on('data', (row) => {
    // Parse each row
    const match = {
      home_college: row.Home_Team,
      away_college: row.Away_Team,
      home_college_score: parseInt(row.Home_Team_Score, 10),
      away_college_score: parseInt(row.Away_Team_Score, 10),
      winner: row.Winner,
      forfeit: row['Forfeit?'],
      date: row.Date,
      time: row.Time,
      location: row.Location,
    };
    matches.push(match);
  })
  .on('end', async () => {
    console.log('CSV parsing complete. Adding matches...');
    await processMatches(matches);
    console.log('Matches added to Firestore!');
  });

