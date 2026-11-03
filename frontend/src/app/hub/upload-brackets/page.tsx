"use client";

import BracketAdminPanel from "@/components/hub/admin/BracketAdminPanel";
import PageHeading from "@/components/layout/PageHeading";
import withRoleProtectedRoute from "@/components/hub/withRoleProtectedRoute";
import React from "react";

const UploadBracketsPage = () => {
  return (
    <div className="min-h-screen pt-20 pb-12">
      <PageHeading heading="Upload/Delete Brackets" />
      <BracketAdminPanel />
    </div>
  );
};

export default withRoleProtectedRoute(UploadBracketsPage, (viewer) => viewer.can.editSchedule);
