"use client";

import BracketAdminPanel from "@/components/hub/admin/BracketAdminPanel";
import BracketBuilder from "@/components/hub/admin/BracketBuilder";
import PageHeading from "@/components/layout/PageHeading";
import withRoleProtectedRoute from "@/components/hub/withRoleProtectedRoute";
import React from "react";

/** Playoffs: the quick builder, then the slot-by-slot editor (with CSV) and deleting a sport's bracket. */
const UploadBracketsPage = () => {
  return (
    <div className="min-h-screen pt-20 pb-12">
      <PageHeading heading="Playoff Brackets" />
      <section className="max-w-4xl mt-8 mx-3 sm:mx-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50 p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-1">New playoffs</h2>
        <p className="text-sm text-gray-500 mb-4">Pick the seeds and the dates; the bracket&apos;s 15 games go on the schedule.</p>
        <BracketBuilder kind="playoffs" />
      </section>
      <h2 className="max-w-6xl mx-auto px-6 mt-10 text-lg font-semibold">Slot by slot, from a CSV, or delete</h2>
      <BracketAdminPanel />
    </div>
  );
};

export default withRoleProtectedRoute(UploadBracketsPage, (viewer) => viewer.can.editSchedule);
