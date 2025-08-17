import DCardLink from "../DCardLink";

const AdminDashboard: React.FC = () => {
  // Fetch required data and pass it into the relevant component
  // You can add more things to the template component based on the info you want to display.
  // You can style things conditionally, You can also make the prop conditional!

  return (
    <div className="p-6 justify-center">
      <h2 className="text-2xl font-medium mb-4">Welcome to the Admin Hub</h2>
      <div className="grid grid-cols-3 gap-6">
        <DCardLink
          title="Score Matches"
          link="/hub/add-scores"
          openLinkInfo="Click to update scores →"
          message="Update/undo scores for matches that have been played!"
        />
        <DCardLink
          title="Upload Matches"
          link="/hub/upload-schedule"
          message="Upload schedules for upcoming sports seasons in CSV format!"
          openLinkInfo="Click to upload match schedules →"
        />
      </div>
      {/* TODO: bracket interface -- will get when the bracket feature is pushed */}
    </div>
  );
};

// export default withRoleProtectedRoute(AdminDashboard, ["admin"]);
export default AdminDashboard; // will switch to withRoleProtectedRoute after development
