"use client";

import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import React from "react";

const CaptainPage = () => {
  return <div className="h-screen pt-5">CaptainPage</div>;
};

export default withRoleProtectedRoute(CaptainPage, ["captain", "dev"]);
