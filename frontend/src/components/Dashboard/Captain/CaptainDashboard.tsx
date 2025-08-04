import withProtectedRoute from "../../withProtectedRoute";
import ViewTeamSignups from "./ViewTeamSignups";
import ViewCaptainSports from "./ViewCaptainSports";
import DCardInfo from "../DCardInfo";

const CaptainDashboard = () => {
  return (
    <div className="p-4 justify-center">
      <h2 className="text-2xl font-bold mb-4">
        Welcome to the Captain Hub
      </h2>
      <div className="grid grid-cols-3 gap-10">
        <DCardInfo 
          title="Your Teams"
          CustomComponent={ViewCaptainSports}
        />
      </div>
      
    </div>
  );
};

export default CaptainDashboard;
// export default withProtectedRoute(CaptainDashboard, "captain"); // will switch to withRoleProtectedRoute after development
