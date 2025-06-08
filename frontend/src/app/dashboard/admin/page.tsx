"use client";

import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import React from "react";

const AdminPage = () => {
  return <div className="h-screen pt-5">AdminPage</div>;
};

export default withRoleProtectedRoute(AdminPage, ["admin", "dev"]);
