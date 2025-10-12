const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to set your service account key)
// For now, let's create a simple version that shows how to check Elos

console.log('🏆 ELO RATING CHECKER');
console.log('===================');

// This is a template - you'll need to:
// 1. Set up your Firebase credentials
// 2. Replace with your project ID
// 3. Run with: node check_elos.js

async function checkElos() {
  try {
    // Initialize Firebase Admin (uncomment and configure when ready)
    /*
    const serviceAccount = require('./path-to-your-service-account-key.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    */
    
    const db = admin.firestore();
    const sport = "Flag Football";
    const year = "2024-2025";
    
    console.log(`\n🔍 Checking Elo ratings for ${sport} (${year})...`);
    
    // Get Elo ratings
    const ratingsSnapshot = await db
      .collection("elo_ratings")
      .doc("seasons")
      .collection(year)
      .where("sport", "==", sport)
      .orderBy("rating", "desc")
      .get();

    if (ratingsSnapshot.empty) {
      console.log(`❌ No Elo ratings found for ${sport}`);
      console.log('💡 You need to initialize Elo ratings first');
      return;
    }

    console.log(`\n✅ Found ${ratingsSnapshot.docs.length} teams with Elo ratings:`);
    console.log('');
    
    let rank = 1;
    ratingsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      console.log(`${rank}. ${data.college}: ${data.rating} (${data.gamesPlayed} games)`);
      rank++;
    });

    // Show top 3
    console.log('\n🏆 TOP 3 TEAMS:');
    ratingsSnapshot.docs.slice(0, 3).forEach((doc, index) => {
      const data = doc.data();
      console.log(`   ${index + 1}. ${data.college}: ${data.rating}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure you have:');
    console.log('   1. Firebase credentials set up');
    console.log('   2. Elo ratings initialized');
  }
}

// Run the check
checkElos();

