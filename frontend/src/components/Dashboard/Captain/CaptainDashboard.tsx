import withProtectedRoute from "../../withProtectedRoute";
import ViewTeamSignups from "./ViewTeamSignups";
import ViewCaptainSports from "./ViewCaptainSports";
import DCardInfo from "../DCardInfo";
import DCardPopup from "../DCardPopup";

const CaptainDashboard = () => {
  return (
    <>
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
    </>
  );
};

export default CaptainDashboard;
// export default withProtectedRoute(CaptainDashboard, "captain"); // will switch to withRoleProtectedRoute after development
