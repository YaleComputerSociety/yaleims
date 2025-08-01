import React, { useEffect, useState } from "react";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { useUser } from "@src/context/UserContext";
import withProtectedRoute from "../../withProtectedRoute";
import ViewTeamSignups from "./ViewTeamSignups";
import LoadingScreen from "../../LoadingScreen";

const CaptainDashboard: React.FC = () => {
  const { user, loading } = useUser();
  const userEmail = user?.email || "";

  const [sports, setSports] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState<string | undefined>(
    undefined
  );
  const [sportsLoading, setSportsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (loading || !userEmail) return;
    const fetchSports = async () => {
      setSportsLoading(true);
      const userRef = doc(db, "users", userEmail);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setSports(data.sportsCaptainOf || []);
        setSelectedSport(data.teams_captain_of?.[0] || undefined);
      }
      setSportsLoading(false);
    };
    fetchSports();
  }, [loading, userEmail, user]);

  if (loading || sportsLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="p-4 justify-center">
      <h2 className="text-2xl font-bold mb-4">
        Welcome to the Captain Hub
      </h2>
      
    </div>
  );
};

export default CaptainDashboard;
// export default withProtectedRoute(CaptainDashboard, "captain"); // will switch to withRoleProtectedRoute after development
