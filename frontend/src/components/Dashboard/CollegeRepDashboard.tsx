import withRoleProtectedRoute from "../withRoleProtectedRoute";
import CaptainSelect from "./CaptainSelect";
import MVPSelect from "./MVPSelect";

const CollegeRepDashboard: React.FC = () => {
  return (
    <div className="p-4 justify-center">
      <h2 className="text-2xl font-bold mb-4">
        Welcome to the College Rep Dashboard
      </h2>
      <p>
        This is where college representatives can manage their teams and
        schedules!
      </p>
      <CaptainSelect />
      <MVPSelect />
      {/* TODO: add ability to see captain role view, but for all in-season sports */}
    </div>
  );
};

// export default withRoleProtectedRoute(CollegeRepDashboard, ["college_rep"]);
export default CollegeRepDashboard; // will switch to withRoleProtectedRoute after development
