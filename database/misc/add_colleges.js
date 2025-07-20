import {firestore} from './firebase.js';

import {collection, doc, setDoc, addDoc} from 'firebase/firestore';

// College data
const colleges = [
    { abbreviation: "BF", name: "Benjamin Franklin" },
    { abbreviation: "BK", name: "Berkeley" },
    { abbreviation: "BR", name: "Branford" },
    { abbreviation: "DC", name: "Davenport" },
    { abbreviation: "ES", name: "Ezra Stiles" },
    { abbreviation: "GH", name: "Grace Hopper" },
    { abbreviation: "JE", name: "Jonathan Edwards" },
    { abbreviation: "MC", name: "Morse" },
    { abbreviation: "PM", name: "Pauli Murray" },
    { abbreviation: "PC", name: "Pierson" },
    { abbreviation: "SY", name: "Saybrook" },
    { abbreviation: "SM", name: "Silliman" },
    { abbreviation: "TD", name: "Timothy Dwight" },
    { abbreviatigcon: "TC", name: "Trumbull" }
  ];

// Function to add colleges to Firestore with references to users and matches
const addCollegesToFirestore = async () => {
    for (const college of colleges) {

  
      // Set document for the college in Firestore
      const collegeRef = doc(firestore, 'colleges', college.abbreviation);
      await setDoc(collegeRef, {
        name: college.name,
        abbreviation: college.abbreviation,
        points: 0,        // Default points set to 0
      });
  
      console.log(`Added ${college.name}`);
    }
  };
  
  // Call the function to add all colleges
  addCollegesToFirestore();