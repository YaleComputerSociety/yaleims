import DCardLink from "../DCardLink";
import DCardInfo from "../DCardInfo";
import StatsBox from "../User/StatsBox"
import ViewCaptainsCollegeRep from "../User/ViewCaptainsCollegeRep";
import { useSeason } from "@src/context/SeasonContext";

const AdminDashboard: React.FC = () => {
  const { currentSeason } = useSeason();
  // Fetch required data and pass it into the relevant component
  // You can add more things to the template component based on the info you want to display.
  // You can style things conditionally, You can also make the prop conditional!

  return (
    <div className="p-6 justify-center">
      <h2 className="text-2xl font-medium mb-4">Welcome to the Admin Hub</h2>
      <div className="grid md:grid-cols-3 grid-cols-2 gap-3 md:gap-6">
        <DCardInfo 
          title={`${currentSeason?.year} Season`}
          CustomComponent={StatsBox}
        />
        <DCardInfo 
          title="Your Captains and College Reps"
          CustomComponent={ViewCaptainsCollegeRep}
        />
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
