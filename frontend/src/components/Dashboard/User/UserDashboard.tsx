import DCardInfo from "../DCardInfo";
import DCardLink from "../DCardLink";
import ViewCaptainsCollegeRep from "./ViewCaptainsCollegeRep";

export default function UserDashboard() {
  return (
    <div className="p-6 justify-center">
      <h2 className="text-2xl font-bold mb-4">Welcome to the User Hub</h2>
      <div className="grid grid-cols-3 gap-6">
        <DCardLink
          title="View Current Standings Here"
          link="/"
          openLinkInfo="Click to view current leaderboard →"
          message="These are the current standings. Where does your college rank? 
                   Sign up for games to increase your college's chances of winning the overall Title!"
        />
        <DCardInfo 
          title="Your Captains and College Rep"
          CustomComponent={ViewCaptainsCollegeRep}
        />

      </div>
    </div>
  );
}
