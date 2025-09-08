import DCardInfo from "../DCardInfo";
import DCardLink from "../DCardLink";
import ViewCaptainsCollegeRep from "./ViewCaptainsCollegeRep";
import StatsBox from "./StatsBox";
import { useSeason } from "@src/context/SeasonContext";

export default function UserDashboard() {
  const { currentSeason } = useSeason();

  return (
    <>
    {/* // <div className="p-6 justify-center">
    //   <h2 className="text-2xl font-bold mb-4">Welcome to the User Hub</h2> */}
      {/* <div className="grid mg:grid-cols-3 grid-cols-2 gap-3 md:gap-6"> */}
        <DCardInfo 
          title={`${currentSeason?.year} Season`}
          CustomComponent={StatsBox}
        />
        <DCardInfo 
          title="Your Captains and College Reps"
          CustomComponent={ViewCaptainsCollegeRep}
        />
        <DCardLink
          title="Sign Up for Upcoming Games"
          link="/schedules"
          openLinkInfo="Click to view schedule →"
          message="View the schedule and sign up for upcoming games!
                   The more games you sign up for, the more points your college can earn!"
        />
        <DCardLink
          title="View Current Standings Here"
          link="/"
          openLinkInfo="Click to view current leaderboard →"
          message="These are the current standings. Where does your college rank? 
                   Sign up for games to increase your college's chances of winning the overall Title!"
        />
        
      {/* </div> */}
    {/* // </div> */}
    </>
  );
}
