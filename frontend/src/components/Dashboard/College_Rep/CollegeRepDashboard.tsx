import withRoleProtectedRoute from "../../withRoleProtectedRoute";
import DCardPopup from "../DCardPopup";
import AssignCaptain from "./AssignCaptain";
import SelectMVP from "./SelectMVP";

const CollegeRepDashboard: React.FC = () => {
  return (
    <div className="p-4 justify-center">
      <h2 className="text-2xl font-bold mb-4">
        Welcome to the College Rep Dashboard
      </h2>
      <div className="grid grid-cols-3 gap-10">
        <DCardPopup
          title="Select Captains"  
          openInfo="Click to View and Select Captains"
          message="Select the Captains for each sport during the season, One Person can be a Captian of multiple sports"
          CustomComponent={SelectMVP}
        />
        <DCardPopup
          title="Select MVP"
          openInfo="Click to Select MVP for the Week"
          message="Select the MVP for the week to have them displayed on the leaderboard Page!"
          CustomComponent={AssignCaptain}
        />
        
      </div>
    </div>
  );
};

// export default withRoleProtectedRoute(CollegeRepDashboard, ["college_rep"]);
export default CollegeRepDashboard; // will switch to withRoleProtectedRoute after development
