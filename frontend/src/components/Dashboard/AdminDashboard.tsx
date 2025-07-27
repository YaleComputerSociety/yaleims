import BracketAdminPanel from "./BracketAdminPanel";
import EditMatches from "./EditMatches";
import UpdateScores from "./UpdateScores";

const AdminDashboard: React.FC = () => {
  return (
    <div className="p-4 justify-center">
      <h2 className="text-2xl font-bold mb-4">
        Welcome to the Admin Dashboard
      </h2>
      <p>You can manage Intramurals at Yale</p>
      <UpdateScores />
      <EditMatches />
      <BracketAdminPanel />
    </div>
  );
};

// export default withRoleProtectedRoute(AdminDashboard, ["admin"]);
export default AdminDashboard; // will switch to withRoleProtectedRoute after development
