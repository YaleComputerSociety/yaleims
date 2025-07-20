"use client";

import React from "react";
import PageHeading from "@src/components/PageHeading";
import { useUser } from "@src/context/UserContext";
import CollegeRepDashboard from "@src/components/Dashboard/CollegeRepDashboard";
import AdminDashboard from "@src/components/Dashboard/AdminDashboard";
import UserDashboard from "@src/components/Dashboard/UserDashboard";
import CaptainDashboard from "@src/components/Dashboard/CaptainDashboard";
import DevDashboard from "@src/components/Dashboard/DevDashboard";

const Dashboard: React.FC = () => {
  const { user } = useUser();

  return (
    <div className="min-h-screen pt-20">
      <PageHeading heading="Dashboard" />
      <div>
        {user?.role === "admin" && <AdminDashboard />}
        <AdminDashboard />
        {user?.role === "user" && <UserDashboard />}
        {user?.role === "captain" && <CaptainDashboard />}
        {user?.role === "college_rep" && <CollegeRepDashboard />}
        {user?.role === "dev" && <DevDashboard />}
        {!user && (
          <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">
              Welcome to the Dashboard
            </h2>
            <p>Please log in to access your dashboard.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
