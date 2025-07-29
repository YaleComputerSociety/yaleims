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
      <div>
        {user?.role === "admin" && <AdminDashboard />}
        {user?.role === "user" && <UserDashboard />}
        {user?.role === "captain" && <CaptainDashboard />}
        {user?.role === "college_rep" && <CollegeRepDashboard />}
        {user?.role === "dev" && <DevDashboard />}
        {!user && (
          <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">
              Welcome to the Hub
            </h2>
            <p>Please log in to access your Hub.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
