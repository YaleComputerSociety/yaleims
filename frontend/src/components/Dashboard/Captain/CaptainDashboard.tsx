import withProtectedRoute from "../../withProtectedRoute";
import ViewTeamSignups from "./ViewTeamSignups";
import ViewCaptainSports from "./ViewCaptainSports";
import DCardInfo from "../DCardInfo";
import DCardPopup from "../DCardPopup";
import StatsBox from "../User/StatsBox"
import ViewCaptainsCollegeRep from "../User/ViewCaptainsCollegeRep";
import { useSeason } from "@src/context/SeasonContext";

const CaptainDashboard = () => {
  const { currentSeason } = useSeason();
  return (
    <div className="p-6 justify-center">
      <h2 className="text-2xl font-bold mb-4">
        Welcome to the Captain Hub
      </h2>
      <div className="grid md:grid-cols-3 grid-cols-2 gap-3 md:gap-6">
        <DCardInfo 
          title={`${currentSeason?.year} Season`}
          CustomComponent={StatsBox}
        />
        <DCardInfo 
          title="Your Captains and College Reps"
          CustomComponent={ViewCaptainsCollegeRep}
        />
        <DCardInfo 
          title="Sports you are a Captain of"
          CustomComponent={ViewCaptainSports}
        />
        <DCardPopup 
          title="Upcoming Games and SignUps!"
          message="You can view the people who have signed up for upcoming games you are a captain of!"
          openInfo="Click to view"
          CustomComponent={ViewTeamSignups}
        />
      </div>
      
    </div>
  );
};

export default CaptainDashboard;
// export default withProtectedRoute(CaptainDashboard, "captain"); // will switch to withRoleProtectedRoute after development
