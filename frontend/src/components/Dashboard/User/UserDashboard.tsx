import DCardInfo from "../DCardInfo";
import DCardLink from "../DCardLink";
import ViewCaptainsCollegeRep from "./ViewCaptainsCollegeRep";
import StatsBox from "./StatsBox";
import { useSeason } from "@src/context/SeasonContext";
import DCardPopup from "../DCardPopup";
import UserMatches from "./UserMatches";

export default function UserDashboard() {
  const { currentSeason } = useSeason();

  return (
    <>
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
      <DCardPopup
        title="Your Upcoming Matches"
        message="View the matches you have signed up for here. Sign up for more matches via the Schedules page!"
        openInfo="Click to view your matches"
        CustomComponent={UserMatches}
      />
    </>
  );
}
