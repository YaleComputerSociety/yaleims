"use client";

import React from "react";
import { useUser } from "@src/context/UserContext";
import LoadingScreen from "@src/components/LoadingScreen";
import PageHeading from "@src/components/PageHeading";
import HeroStats from "@src/components/Dashboard/User/HeroStats";
import QuickActionCard from "@src/components/Dashboard/QuickActionCard";
import SectionCard from "@src/components/Dashboard/SectionCard";
import PopupActionCard from "@src/components/Dashboard/PopupActionCard";
import ScoreReportsAdmin from "@src/components/Dashboard/Admin/ScoreReportsAdmin";
import ViewCaptainsCollegeRep from "@src/components/Dashboard/User/ViewCaptainsCollegeRep";
import UserMatches from "@src/components/Dashboard/User/UserMatches";
import AssignCaptain from "@src/components/Dashboard/College_Rep/AssignCaptain";
import SelectMVP from "@src/components/Dashboard/College_Rep/SelectMVP";
import ViewCaptainSports from "@src/components/Dashboard/Captain/ViewCaptainSports";
import ViewTeamSignups from "@src/components/Dashboard/Captain/ViewTeamSignups";

type HubAction = {
  title: string;
  link?: string;
  icon: string;
  description: string;
  gradient: string;
  isPopup?: boolean;
  CustomComponent?: React.ComponentType;
};

const Dashboard: React.FC = () => {
  const { user, loading } = useUser();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-20 px-6">
        <PageHeading heading="Hub" />
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-gray-400">Please log in to access your Hub.</p>
        </div>
      </div>
    );
  }

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
      title: "Place Bets",
      link: "/odds",
      icon: "🎯",
      description: "Predict match outcomes and earn YCoins",
      gradient: "from-purple-500/10 to-pink-500/10",
    },
    {
      title: "View Brackets",
      link: "/brackets",
      icon: "🏅",
      description: "Check playoff brackets",
      gradient: "from-emerald-500/10 to-green-500/10",
    },
  ];

  const adminActions: HubAction[] = [
    {
      title: "Score Matches",
      link: "/hub/add-scores",
      icon: "📊",
      description: "Update scores for completed matches",
      gradient: "from-red-500/10 to-orange-500/10",
    },
    {
      title: "Upload Matches",
      link: "/hub/upload-schedule",
      icon: "📤",
      description: "Upload match schedules (CSV)",
      gradient: "from-indigo-500/10 to-blue-500/10",
    },
    {
      title: "Upload Brackets",
      link: "/hub/upload-brackets",
      icon: "🗂️",
      description: "Manage playoff brackets",
      gradient: "from-violet-500/10 to-purple-500/10",
    },
    {
      title: "Manage Roles",
      link: "/hub/manage-user-roles",
      icon: "👥",
      description: "Edit user permissions",
      gradient: "from-teal-500/10 to-cyan-500/10",
    },
    {
      title: "Score Reports",
      icon: "🚩",
      description: "View and resolve score dispute reports",
      gradient: "from-amber-500/10 to-yellow-500/10",
      isPopup: true,
      CustomComponent: ScoreReportsAdmin,
    },
  ];

  const isAdmin = user?.mRoles.includes("admin");
  const isCollegeRep = user?.mRoles.includes("college_rep");
  const isCaptain = user?.mRoles.includes("captain");

  return (
    <div className="min-h-screen pt-20 pb-12">
      <PageHeading heading="Hub" />
      <div className="max-w-6xl mx-auto px-2 md:px-4">
        {/* Hero Stats Section */}
        <HeroStats />

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
                link={action.link}
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

        {/* Admin Section */}
        {isAdmin && (
          <section className="mb-8 rounded-2xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] p-4 md:p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-400" /> Admin Tools
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {adminActions.map((action) =>
                action.isPopup && action.CustomComponent ? (
                  <PopupActionCard
                    key={action.title}
                    title={action.title}
                    icon={action.icon}
                    description={action.description}
                    gradient={action.gradient}
                    CustomComponent={action.CustomComponent}
                  />
                ) : (
                  <QuickActionCard
                    key={action.title}
                    title={action.title}
                    link={action.link!}
                    icon={action.icon}
                    description={action.description}
                    gradient={action.gradient}
                  />
                )
              )}
            </div>
          </section>
        )}

        {/* College Rep Section */}
        {isCollegeRep && (
          <section className="mb-8 rounded-2xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] p-4 md:p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" /> College Rep Tools
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <PopupActionCard
                title="Select Captains"
                icon="👔"
                description="Assign captains for each sport"
                gradient="from-indigo-500/10 to-purple-500/10"
                CustomComponent={AssignCaptain}
              />
              <PopupActionCard
                title="Select MVP"
                icon="⭐"
                description="Choose the MVP of the week"
                gradient="from-amber-500/10 to-orange-500/10"
                CustomComponent={SelectMVP}
              />
            </div>
          </section>
        )}

        {/* Captain Section */}
        {isCaptain && (
          <section className="mb-8 rounded-2xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] p-4 md:p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" /> Captain Tools
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <PopupActionCard
                title="Sports You Captain"
                icon="🏅"
                description="View your captain assignments"
                gradient="from-emerald-500/10 to-teal-500/10"
                CustomComponent={ViewCaptainSports}
              />
              <PopupActionCard
                title="Game Signups"
                icon="📋"
                description="See who signed up for games"
                gradient="from-blue-500/10 to-cyan-500/10"
                CustomComponent={ViewTeamSignups}
              />
            </div>
          </section>
        )}

        {!isAdmin && !isCollegeRep && !isCaptain && (
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/[0.02] p-4 text-sm text-gray-700 dark:text-gray-300">
            You have standard user access. Quick actions and personal stats are available above.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
