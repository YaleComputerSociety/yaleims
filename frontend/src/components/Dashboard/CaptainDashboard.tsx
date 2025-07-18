import withProtectedRoute from "../withProtectedRoute";
import ViewTeamSignups from "./ViewTeamSignups";

const CaptainDashboard: React.FC = () => {
  return (
    <div className="p-4 justify-center">
      <h2 className="text-2xl font-bold mb-4">
        Welcome to the Captain Dashboard
      </h2>
      <p>This is where captains can invite people to attend games!</p>
      <ViewTeamSignups />
    </div>
  );
};

export default CaptainDashboard;
// export default withProtectedRoute(CaptainDashboard, "captain"); // will switch to withRoleProtectedRoute after development
