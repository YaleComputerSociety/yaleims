"use client";

import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import React from "react";

const CollegeRepPage = () => {
  return <div className="h-screen pt-5">CollegeRepPage</div>;
};

export default withRoleProtectedRoute(CollegeRepPage, ["college-rep", "dev"]);
