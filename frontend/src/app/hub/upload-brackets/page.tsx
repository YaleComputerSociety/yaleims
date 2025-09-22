"use client";

import BracketAdminPanel from "@src/components/Dashboard/Admin/BracketAdminPanel";
import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import React from "react";

const UploadBracketsPage = () => {
  return (
    <div className="min-h-screen pt-20">
      <BracketAdminPanel />
    </div>
  );
};

export default withRoleProtectedRoute(UploadBracketsPage, ["admin", "dev"]);
