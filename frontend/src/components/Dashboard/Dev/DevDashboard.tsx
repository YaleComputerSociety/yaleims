import React from "react";
import withRoleProtectedRoute from "../../withRoleProtectedRoute";
import BracketAdminPanel from "../Admin/BracketAdminPanel";
import EditMatches from "../Admin/EditMatches";

const DevDashboard = () => {
  return (
    <div className="p-4 justify-center">
      <h2 className="text-2xl font-bold mb-4">Welcome to the Dev Hub</h2>
      <p>This is where developers can manage their users!</p>
      <BracketAdminPanel />
      <EditMatches />
    </div>
  );
};

export default DevDashboard;
// export default withRoleProtectedRoute(DevDashboard, ['dev']); // will switch to withRoleProtectedRoute after development
