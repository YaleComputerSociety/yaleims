"use client";
// The Hub: everyone's games and quick links, then a section per thing the
// viewer may do (the session's `can`, captaincies and rep role): game day
// (supervisors), the schedule, admin, the college rep's and the captain's
// tools.

import React from "react";
import { hasRole, useSession } from "@/context/SessionContext";
import LoadingScreen from "@/components/layout/LoadingScreen";
import PageHeading from "@/components/layout/PageHeading";
import HeroStats from "@/components/hub/player/HeroStats";
import QuickActionCard from "@/components/hub/QuickActionCard";
import SectionCard from "@/components/hub/SectionCard";
import PopupActionCard from "@/components/hub/PopupActionCard";
import ScoreReportsAdmin from "@/components/hub/admin/ScoreReportsAdmin";
import ChampionControls from "@/components/hub/admin/ChampionControls";
import ViewCaptainsCollegeRep from "@/components/hub/player/ViewCaptainsCollegeRep";
import UserMatches from "@/components/hub/player/UserMatches";
import AssignCaptain from "@/components/hub/rep/AssignCaptain";
import SelectMVP from "@/components/hub/rep/SelectMVP";
import SignInPrompt from "@/components/layout/SignInPrompt";

type HubAction = {
  title: string;
  icon: string;
  description: string;
  gradient: string;
  /** Show it (default: always). */
  when?: boolean;
} & ({ link: string } | { popup: React.ComponentType });

/** A titled block of action cards; nothing when none of its actions is shown. */
function ToolSection({ title, dot, actions }: { title: string; dot: string; actions: HubAction[] }) {
  const shown = actions.filter((a) => a.when !== false);
  if (shown.length === 0) return null;
  return (
    <section className="mb-8 rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.02] p-4 md:p-5">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${dot}`} /> {title}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {shown.map((action) =>
          "popup" in action ? (
            <PopupActionCard
              key={action.title}
              title={action.title}
              icon={action.icon}
              description={action.description}
              gradient={action.gradient}
              CustomComponent={action.popup}
            />
          ) : (
            <QuickActionCard
              key={action.title}
              title={action.title}
              link={action.link}
              icon={action.icon}
              description={action.description}
              gradient={action.gradient}
            />
          )
        )}
      </div>
    </section>
  );
}

const Dashboard: React.FC = () => {
  const { viewer, loading } = useSession();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!viewer) {
    return (
      <div className="min-h-screen pt-20 px-6">
        <PageHeading heading="Hub" />
        <div className="max-w-6xl mx-auto">
          <SignInPrompt message="Sign in to see your Hub." />
        </div>
      </div>
    );
  }

  const { can } = viewer;
  const isCollegeRep = hasRole(viewer, "college_rep");
  const isCaptain = viewer.captainOf.length > 0;

  const userActions: HubAction[] = [
    {
      title: "Sign Up for Games",
      link: "/schedules",
      icon: "📅",
      description: "View schedule and sign up for upcoming matches",
      gradient: "from-blue-500/10 to-cyan-500/10",
    },
    {
      title: "View Standings",
      link: "/",
      icon: "🏆",
      description: "Check current college rankings",
      gradient: "from-amber-500/10 to-yellow-500/10",
    },
    {
      title: "View Brackets",
      link: "/brackets",
      icon: "🏅",
      description: "Check playoff brackets",
      gradient: "from-emerald-500/10 to-green-500/10",
    },
    {
      title: "View Tournaments",
      link: "/tournaments",
      icon: "🏐",
      description: "Follow one-day tournament brackets and placement points",
      gradient: "from-sky-500/10 to-indigo-500/10",
    },
  ];

  return (
    <div className="min-h-screen pt-20 pb-12">
      <PageHeading heading="Hub" />
      <div className="max-w-6xl mx-auto px-2 md:px-4">
        <HeroStats />

        {/* Game day first: it's what supervisors open the Hub for. */}
        <ToolSection
          title="Game Day"
          dot="bg-emerald-400"
          actions={[
            {
              title: "Game Day",
              link: "/hub/game-day",
              icon: "📋",
              description: "Today's games: confirm who played and enter scores",
              gradient: "from-emerald-500/15 to-teal-500/10",
              when: can.takeAttendance,
            },
            {
              title: "Unscored Games",
              link: "/hub/add-scores",
              icon: "📊",
              description: "Every past game still waiting for a score",
              gradient: "from-red-500/10 to-orange-500/10",
              when: can.score,
            },
            {
              title: "Score Reports",
              popup: ScoreReportsAdmin,
              icon: "🚩",
              description: "View and resolve score dispute reports",
              gradient: "from-amber-500/10 to-yellow-500/10",
              when: can.score,
            },
          ]}
        />

        <ToolSection
          title="My Team"
          dot="bg-emerald-400"
          actions={[
            {
              title: "My Team",
              link: "/hub/my-team",
              icon: "🧢",
              description: "Your team's games: pre-confirm who's playing",
              gradient: "from-emerald-500/10 to-teal-500/10",
              when: isCaptain,
            },
          ]}
        />

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400" /> Quick Actions
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {userActions.map((action) => (
              <QuickActionCard
                key={action.title}
                title={action.title}
                link={"link" in action ? action.link : "/"}
                icon={action.icon}
                description={action.description}
                gradient={action.gradient}
              />
            ))}
          </div>
        </section>

        {/* Info Sections */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <SectionCard title="Your Captains & College Reps" icon="👑">
            <ViewCaptainsCollegeRep />
          </SectionCard>

          <SectionCard title="Your Upcoming Matches" icon="🎮">
            <UserMatches />
          </SectionCard>
        </div>

        <ToolSection
          title="Schedule"
          dot="bg-indigo-400"
          actions={[
            {
              title: "Add Games",
              link: "/hub/upload-schedule",
              icon: "➕",
              description: "Add one game, or a sport's whole schedule from a CSV",
              gradient: "from-indigo-500/10 to-blue-500/10",
              when: can.editSchedule,
            },
            {
              title: "Playoff Brackets",
              link: "/hub/upload-brackets",
              icon: "🗂️",
              description: "Create and manage playoff brackets",
              gradient: "from-violet-500/10 to-purple-500/10",
              when: can.editSchedule,
            },
            {
              title: "Tournaments",
              link: "/hub/upload-tournaments",
              icon: "🏆",
              description: "Set up one-day tournaments and their placement points",
              gradient: "from-fuchsia-500/10 to-pink-500/10",
              when: can.editSchedule,
            },
          ]}
        />

        <ToolSection
          title="Admin"
          dot="bg-amber-400"
          actions={[
            {
              title: "Manage Roles",
              link: "/hub/manage-user-roles",
              icon: "👥",
              description: "Admins, supervisors, reps and captains",
              gradient: "from-teal-500/10 to-cyan-500/10",
              when: can.manageRoles,
            },
            {
              title: "People",
              link: "/hub/people",
              icon: "🔎",
              description: "Find anyone by NetID; fix a college, name or attendance",
              gradient: "from-sky-500/10 to-blue-500/10",
              when: can.managePeople,
            },
            {
              title: "Review Requests",
              link: "/hub/reviews",
              icon: "📨",
              description: "Answer what people asked to have checked",
              gradient: "from-rose-500/10 to-orange-500/10",
              when: can.managePeople,
            },
            {
              title: "Champion Celebration",
              popup: ChampionControls,
              icon: "🏆",
              description: "Pick the winning college and toggle the celebration",
              gradient: "from-yellow-500/10 to-amber-500/10",
              when: can.setChampion,
            },
          ]}
        />

        <ToolSection
          title="College Rep Tools"
          dot="bg-indigo-400"
          actions={[
            {
              title: "Select Captains",
              popup: AssignCaptain,
              icon: "👔",
              description: "Assign captains for each sport",
              gradient: "from-indigo-500/10 to-purple-500/10",
              when: isCollegeRep,
            },
            {
              title: "Select MVP",
              popup: SelectMVP,
              icon: "⭐",
              description: "Choose the MVP of the week",
              gradient: "from-amber-500/10 to-orange-500/10",
              when: isCollegeRep,
            },
          ]}
        />
      </div>
    </div>
  );
};

export default Dashboard;
