"use client";

import TournamentAdminPanel from "@src/components/Dashboard/Admin/TournamentAdminPanel";
import PageHeading from "@src/components/PageHeading";
import withRoleProtectedRoute from "@src/components/withRoleProtectedRoute";
import React from "react";

const UploadTournamentsPage = () => {
  return (
    <div className="min-h-screen pt-20 pb-12">
      <PageHeading heading="Create/Delete Tournaments" />
      <TournamentAdminPanel />
    </div>
  );
};

export default withRoleProtectedRoute(UploadTournamentsPage, ["admin", "dev"]);
