import DCardLink from "../DCardLink";

const AdminDashboard: React.FC = () => {
  // Fetch required data and pass it into the relevant component
  // You can add more things to the template component based on the info you want to display.
  // You can style things conditionally, You can also make the prop conditional!

  return (
    <div className="p-4 justify-center">
      <h2 className="text-2xl font-medium mb-4">Welcome to the Admin Hub</h2>
      <div className="grid grid-cols-3 gap-10">
        <DCardLink
          title="Score Matches"
          link="/add-scores"
          message="5 matches left to scores. You've got this. You made a mistake? don't worry you can undo that score!"
        />
        <DCardLink
          title="Upload Matches"
          link="/hub/upload-schedule"
          message="You have uploaded schedules for 2 sports!"
        />
      </div>
      {/* bracket interface -- will get when the bracket feature is pushed */}
    </div>
  );
};

// export default withRoleProtectedRoute(AdminDashboard, ["admin"]);
export default AdminDashboard; // will switch to withRoleProtectedRoute after development
