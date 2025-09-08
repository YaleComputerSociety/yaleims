"use client";

import React from "react";
import PageHeading from "@src/components/PageHeading";
import { useUser } from "@src/context/UserContext";
import CollegeRepDashboard from "@src/components/Dashboard/College_Rep/CollegeRepDashboard";
import AdminDashboard from "@src/components/Dashboard/Admin/AdminDashboard";
import UserDashboard from "@src/components/Dashboard/User/UserDashboard";
import CaptainDashboard from "@src/components/Dashboard/Captain/CaptainDashboard";
import DevDashboard from "@src/components/Dashboard/Dev/DevDashboard";
import LoadingScreen from "@src/components/LoadingScreen";

const Dashboard: React.FC = () => {
  const { user, loading } = useUser();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen pt-20">
      <PageHeading heading="Hub" />
      <div className="flex flex-col px-10 pb-10">
        <h2 className="text-2xl font-bold mb-4">Welcome to the Hub</h2>
        <div className="grid md:grid-cols-3 grid-cols-2 gap-3 md:gap-6">
          {user?.mRoles.includes("user") && <UserDashboard />}
          {user?.mRoles.includes("admin") && <AdminDashboard />}
          {user?.mRoles.includes("college_rep") && <CollegeRepDashboard />}
          {user?.mRoles.includes("captain") && <CaptainDashboard />}
          {/* {user?.mRoles.includes("dev") && <DevDashboard />} */}
          {!user && (
            <div className="p-6">
              <p>Please log in to access your Hub.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
