import withRoleProtectedRoute from "../../withRoleProtectedRoute";
import DCardPopup from "../DCardPopup";
import AssignCaptain from "./AssignCaptain";
import SelectMVP from "./SelectMVP";

const CollegeRepDashboard: React.FC = () => {
  return (
    <>
      <DCardPopup
        title="Select Captains"  
        openInfo="Click to View and Select Captains"
        message="Select the Captains for each sport during the season, One Person can be a Captian of multiple sports"
        CustomComponent={AssignCaptain}
      />
      <DCardPopup
        title="Select MVP"
        openInfo="Click to Select MVP for the Week"
        message="Select the MVP for the week to have them displayed on the leaderboard Page!"
        CustomComponent={SelectMVP}
      />
    </>
  );
};

// export default withRoleProtectedRoute(CollegeRepDashboard, ["college_rep"]);
export default CollegeRepDashboard; // will switch to withRoleProtectedRoute after development
