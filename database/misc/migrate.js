import { firestore } from "./firebase.js";
import { collection, getDocs, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const seasonId = "2024-2025";
const sourceCollection = "matches"; // flat source
const targetCollectionPath = `matches/seasons/${seasonId}`; // season collection

async function migrate() {
  const srcSnap = await getDocs(collection(firestore, sourceCollection));
  let copied = 0, skipped = 0;
  for (const d of srcSnap.docs) {
    if (d.id === "seasons") continue; // avoid the placeholder doc
    const destRef = doc(firestore, targetCollectionPath, d.id);
    if ((await getDoc(destRef)).exists()) { skipped++; continue; }
    await setDoc(destRef, { ...d.data(), season: seasonId, migratedAt: serverTimestamp() });
    copied++;
  }
  console.log(`Copied ${copied}, skipped ${skipped}.`);
}

migrate();
