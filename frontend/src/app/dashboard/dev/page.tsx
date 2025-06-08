"use client";

import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import React from "react";

const DevPage = () => {
  return <div className="h-screen pt-5">DevPage</div>;
};

export default withRoleProtectedRoute(DevPage, ["dev"]);
