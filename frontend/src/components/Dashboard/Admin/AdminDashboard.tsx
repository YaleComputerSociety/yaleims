import DCardLink from "../DCardLink";

const AdminDashboard: React.FC = () => {
  // Fetch required data and pass it into the relevant component
  // You can add more things to the template component based on the info you want to display.
  // You can style things conditionally, You can also make the prop conditional!

  return (
    //   <div className="p-6 justify-center">
    //     <h2 className="text-2xl font-medium mb-4">Welcome to the Admin Hub</h2>
    //     <div className="grid md:grid-cols-3 grid-cols-2 gap-3 md:gap-6">
    <>
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
      <DCardLink
        title="Upload Brackets"
        link="/hub/upload-brackets"
        message="Upload or delete bracket information for upcoming playoff seasons!"
        openLinkInfo="Click to upload bracket information →"
      />
      <DCardLink
        title="Manage User Roles"
        link="/hub/manage-user-roles"
        message="Add, remove, or modify user roles and permissions!"
        openLinkInfo="Click to manage user roles →"
      />
    </>
  );
};

// export default withRoleProtectedRoute(AdminDashboard, ["admin"]);
export default AdminDashboard; // will switch to withRoleProtectedRoute after development
