"use client";

import TournamentAdminPanel from "@/components/hub/admin/TournamentAdminPanel";
import PageHeading from "@/components/layout/PageHeading";
import withRoleProtectedRoute from "@/components/hub/withRoleProtectedRoute";
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
