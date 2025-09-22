"use client";

import BracketAdminPanel from "@src/components/Dashboard/Admin/BracketAdminPanel";
import PageHeading from "@src/components/PageHeading";
import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import React from "react";

const UploadBracketsPage = () => {
  return (
    <div className="min-h-screen pt-20">
      <PageHeading heading="Upload/Delete Brackets" />
      <BracketAdminPanel />
    </div>
  );
};

export default withRoleProtectedRoute(UploadBracketsPage, ["admin", "dev"]);
