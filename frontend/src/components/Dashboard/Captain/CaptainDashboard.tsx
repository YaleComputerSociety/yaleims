import withProtectedRoute from "../../withProtectedRoute";
import ViewTeamSignups from "./ViewTeamSignups";
import ViewCaptainSports from "./ViewCaptainSports";
import DCardInfo from "../DCardInfo";
import DCardPopup from "../DCardPopup";

const CaptainDashboard = () => {
  return (
    <div className="p-4 justify-center">
      <h2 className="text-2xl font-bold mb-4">
        Welcome to the Captain Hub
      </h2>
      <div className="grid grid-cols-3 gap-10">
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
